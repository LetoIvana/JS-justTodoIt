import { BodyParams, Controller, Get, Post, Req, Res, QueryParams } from '@tsed/common';
import { Required, Email, Property, Enum, Returns, Summary, Description, MinLength, Pattern } from '@tsed/schema';
import { Auth } from '../../decorators/auth.decorator';
import { User } from '../../entities/user';
import { ResponseErrorCode } from '../../enums/response-error-code.enum';
import { clearSessionCookie, sanitizeUser, setSessionCookie } from '../../helpers';
import { AuthService } from '../../services/auth/auth.service';
import { UserService } from '../../services/user/user.service';
import { BadRequest, Conflict, Forbidden, NotFound, Unauthorized, UnprocessableEntity } from '@tsed/exceptions';
import { DemographicProfile } from '../../entities/demographic-profile';
import { Gender } from '../../enums/gender.enum';
import { NewsletterPreferences } from '../../entities/newsletter-preferences';

class RegisterData {
	@Required()
	@Email()
	email: string;

	@Property()
	@Description('User will automatically be activated if password is set during registration')
	password: string;
}

class ResendActivationEmailData {
	@Required()
	@Email()
	email: string;
}

class LoginData {
	@Required()
	@Email()
	email: string;

	@Required()
	password: string;
}

// Same rules as the frontend's set password form: at least one uppercase letter, lowercase letter, digit and
// ASCII special character (!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~)
// A string, not a RegExp: Ts.ED would put the slashes and flags into the schema. AJV compiles it with the `u` flag.
const passwordPattern = '^(?=.*\\p{Lu})(?=.*\\p{Ll})(?=.*[0-9])(?=.*[!-/:-@[-`{-~])';

class PasswordSettingData {
	@Required()
	token: string;

	@Required()
	@MinLength(8)
	@Pattern(passwordPattern)
	@Description(
		'At least 8 characters, with at least one uppercase letter, lowercase letter, digit and special character'
	)
	password: string;
}

class RequestPasswordResetData {
	@Required()
	@Email()
	email: string;
}

class DemographicProfileSettingData {
	@Required()
	@Enum(Gender)
	gender: Gender;

	@Required()
	age: number;
}

class NewsletterPreferencesSettingData {
	@Required()
	weeklyNewsletter: boolean;

	@Required()
	specialOffers: boolean;
}

@Controller('/auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly userService: UserService
	) {}

	@Post('/register')
	@Summary('Registration')
	@Returns(200, User)
	@(Returns(Conflict.STATUS).Description('User with given email already exists'))
	async register(@BodyParams() { email, password }: RegisterData): Promise<User> {
		const existing = await this.userService.fetch({ email });

		if (existing) {
			throw new Conflict(ResponseErrorCode.USER_EXISTS);
		}

		const user = await this.userService.create({ email, password });

		return sanitizeUser(user);
	}

	@Post('/resend-activation-email')
	@Summary('Resend activation email')
	@Returns(204)
	@(Returns(BadRequest.STATUS).Description('User with given email does not exist'))
	@(Returns(UnprocessableEntity.STATUS).Description('User with given email has already been activated'))
	async resendActivationEmail(@BodyParams() { email }: ResendActivationEmailData, @Res() res: Res): Promise<void> {
		const user = await this.userService.fetch({
			email,
			getActivationToken: true,
			getPasswordHash: true,
		});

		if (!user) {
			throw new BadRequest(ResponseErrorCode.USER_DOES_NOT_EXISTS, { email });
		}

		if (user.isActivated) {
			throw new UnprocessableEntity(ResponseErrorCode.USER_ALREADY_ACTIVATED, {
				email,
			});
		}

		const activationToken = await this.userService.createActivationToken(user);
		await this.userService.sendActivationEmail(user.email, activationToken);

		await user.save();

		res.sendStatus(204);
	}

	@Post('/login')
	@Summary('Login')
	@Returns(200, User)
	@(Returns(Unauthorized.STATUS).Description('Incorrect email or password'))
	async login(@BodyParams() { email, password }: LoginData, @Res() res: Res): Promise<User> {
		const user = await this.userService.fetch({
			email,
			getPasswordHash: true,
		});

		if (!user) {
			throw new Unauthorized(ResponseErrorCode.INCORRECT_EMAIL_OR_PASSWORD);
		}

		// Accounts are only activated by setting a password, so unactivated users can never match
		const passwordOk = Boolean(user.passwordHash) && (await this.userService.compareHash(password, user.passwordHash));

		if (!passwordOk) {
			throw new Unauthorized(ResponseErrorCode.INCORRECT_EMAIL_OR_PASSWORD);
		}

		const token = await this.authService.createToken(user);
		setSessionCookie(res, token);

		res.user = user;

		return sanitizeUser(user);
	}

	@Post('/logout')
	@Summary('Logout')
	@Auth({ passUser: true, passToken: true })
	@Returns(204)
	logout(@Req() req: Req, @Res() res: Res): void {
		this.authService.revokeToken(req.token, req.tokenData);
		clearSessionCookie(res);
		res.sendStatus(204);
	}

	@Post('/activate')
	@Summary('Activation')
	@Returns(200, User)
	async activate(@BodyParams() { token, password }: PasswordSettingData, @Res() res: Res): Promise<User> {
		const activationResult = await this.userService.activate({
			token,
			password,
		});

		if (!activationResult) {
			throw new Forbidden(ResponseErrorCode.ACTIVATION_TOKEN_EXPIRED_OR_INVALID);
		}

		res.user = activationResult;

		return sanitizeUser(activationResult);
	}

	@Post('/request-password-reset')
	@Summary('Request password reset')
	@Returns(204)
	async requestPasswordReset(@BodyParams() { email }: RequestPasswordResetData, @Res() res: Res): Promise<void> {
		const user = await this.userService.fetch({ email, getPasswordHash: true });

		if (!user) {
			res.sendStatus(204);
			return;
		}

		await this.userService.requestPasswordReset(user);
		res.user = user;

		res.sendStatus(204);
	}

	@Post('/reset-password')
	@Summary('Reset password')
	async resetPassword(@BodyParams() { token, password }: PasswordSettingData, @Res() res: Res): Promise<User> {
		const resetResult = await this.userService.resetPassword({
			token,
			password,
		});

		if (!resetResult) {
			throw new BadRequest(ResponseErrorCode.PASSWORD_RESET_TOKEN_EXPIRED_OR_INVALID);
		}

		res.user = resetResult;

		return sanitizeUser(resetResult);
	}

	@Get('/user')
	@Auth({ passUser: true })
	@Summary('Get user data')
	@Returns(200, User)
	async user(
		@Description(
			'Relationships to load. Possible values: `todoLists`, `todoLists.todos`, `demographicProfile`, `newsletterPreferences`'
		)
		@QueryParams('relations', String)
		relations: Array<string>,
		@Req() req: Req
	): Promise<User> {
		if (!relations?.length) {
			return req.user;
		}

		return this.userService.fetch({
			uuid: req.user.uuid,
			relations,
		});
	}

	@Get('/demographic-profile')
	@Summary('Get demographic profile')
	@Auth({ passUser: true })
	async getDemographicProfile(@Req() req: Req): Promise<DemographicProfile> {
		const demographicProfile = await this.userService.fetchDemographicProfile(req.user.uuid);

		if (!demographicProfile) {
			throw new NotFound('User has no demographic profile set');
		}

		return demographicProfile;
	}

	@Post('/demographic-profile')
	@Summary('Set demographic profile')
	@Auth({ passUser: true })
	async setDemographicProfile(
		@Req() req: Req,
		@BodyParams() { gender, age }: DemographicProfileSettingData
	): Promise<DemographicProfile> {
		const demographicProfile =
			(await this.userService.fetchDemographicProfile(req.user.uuid)) ?? new DemographicProfile();

		demographicProfile.gender = gender;
		demographicProfile.age = age;
		await demographicProfile.save();

		req.user.demographicProfile = demographicProfile;
		await req.user.save();

		return req.user.demographicProfile;
	}

	@Get('/newsletter-preferences')
	@Summary('Get newsletter preferences')
	@Auth({ passUser: true })
	async getNewsletterPreferences(@Req() req: Req): Promise<NewsletterPreferences> {
		const newsletterPreferences = await this.userService.fetchNewsletterPreferences(req.user.uuid);

		if (!newsletterPreferences) {
			throw new NotFound('User has no newsletter preferences set');
		}

		return newsletterPreferences;
	}

	@Post('/newsletter-preferences')
	@Summary('Set newsletter preferences')
	@Auth({ passUser: true })
	async setNewsletterPreferences(
		@Req() req: Req,
		@BodyParams()
		{ weeklyNewsletter, specialOffers }: NewsletterPreferencesSettingData
	): Promise<NewsletterPreferences> {
		const newsletterPreferences =
			(await this.userService.fetchNewsletterPreferences(req.user.uuid)) ?? new NewsletterPreferences();

		newsletterPreferences.weeklyNewsletter = weeklyNewsletter;
		newsletterPreferences.specialOffers = specialOffers;
		await newsletterPreferences.save();

		req.user.newsletterPreferences = newsletterPreferences;
		await req.user.save();

		return req.user.newsletterPreferences;
	}
}
