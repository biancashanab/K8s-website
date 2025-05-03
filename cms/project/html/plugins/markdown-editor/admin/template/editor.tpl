//delete tinymce and editor button
script#tinymce-options-js|delete
script#tinymce-js|delete
script#tinymce-js|delete
.page-editor-btn|delete

//add markdown editor
body|append = '<script src="../../plugins/markdown-editor/admin/easymde.min.js"></script>'
body|append = '<script src="../../plugins/markdown-editor/admin/init.js"></script>'
body|append = '<link href="../../plugins/markdown-editor/admin/easymde.min.css" rel="stylesheet"/>'
