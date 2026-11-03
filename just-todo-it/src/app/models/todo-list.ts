export interface TodoItem {
	uuid: string;
	title: string;
	done: boolean;
}

export interface TodoList {
	uuid: string;
	title: string;
	created: string;
	// Only present when requested with `relations=todos`
	todos?: TodoItem[];
}

// What the form edits and the service sends; a new item has no uuid yet, or an empty one
export interface TodoItemData {
	uuid?: string;
	title: string;
	done: boolean;
}

export interface TodoListData {
	title: string;
	todos: TodoItemData[];
}

export function toTodoListData({ title, todos = [] }: TodoList): TodoListData {
	return { title, todos: todos.map(({ uuid, title, done }) => ({ uuid, title, done })) };
}
