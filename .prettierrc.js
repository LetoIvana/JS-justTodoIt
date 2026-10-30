module.exports = {
	printWidth: 120,
	endOfLine: 'lf',
	useTabs: true,
	tabWidth: 2,
	arrowParens: 'always',
	quoteProps: 'as-needed',
	bracketSpacing: true,
	singleQuote: true,
	semi: true,
	trailingComma: 'es5',
	overrides: [
		{
			files: '*.html',
			options: {
				parser: 'angular',
			},
		},
	],
};
