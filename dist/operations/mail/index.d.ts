type Options = {
    body: string;
    to: string;
    type: 'wysiwyg' | 'markdown';
    subject: string;
};
declare const _default: import("@directus/types").OperationApiConfig<Options>;
export default _default;
