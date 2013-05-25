var FileActions = {
	actions: {},
	defaults: {},
	icons: {},
	currentFile: null,
	register: function (mime, name, permissions, icon, action) {
		if (!FileActions.actions[mime]) {
			FileActions.actions[mime] = {};
		}
		if (!FileActions.actions[mime][name]) {
			FileActions.actions[mime][name] = {};
		}
		FileActions.actions[mime][name]['action'] = action;
		FileActions.actions[mime][name]['permissions'] = permissions;
		FileActions.icons[name] = icon;
	},
	setDefault: function (mime, name) {
		FileActions.defaults[mime] = name;
	},
	get: function (mime, type, permissions) {
		var actions = {};
		if (FileActions.actions.all) {
			actions = $.extend(actions, FileActions.actions.all);
		}
		if (mime) {
			if (FileActions.actions[mime]) {
				actions = $.extend(actions, FileActions.actions[mime]);
			}
			var mimePart = mime.substr(0, mime.indexOf('/'));
			if (FileActions.actions[mimePart]) {
				actions = $.extend(actions, FileActions.actions[mimePart]);
			}
		}
		if (type) {//type is 'dir' or 'file'
			if (FileActions.actions[type]) {
				actions = $.extend(actions, FileActions.actions[type]);
			}
		}
		var filteredActions = {};
		$.each(actions, function (name, action) {
			if (action.permissions & permissions) {
				filteredActions[name] = action.action;
			}
		});
		return filteredActions;
	},
	getDefault: function (mime, type, permissions) {
		if (mime) {
			var mimePart = mime.substr(0, mime.indexOf('/'));
		}
		var name = false;
		if (mime && FileActions.defaults[mime]) {
			name = FileActions.defaults[mime];
		} else if (mime && FileActions.defaults[mimePart]) {
			name = FileActions.defaults[mimePart];
		} else if (type && FileActions.defaults[type]) {
			name = FileActions.defaults[type];
		} else {
			name = FileActions.defaults.all;
		}
		var actions = this.get(mime, type, permissions);
		return actions[name];
	},
	display: function (parent) {
		FileActions.currentFile = parent;
		var actions = FileActions.get(FileActions.getCurrentMimeType(), FileActions.getCurrentType(), FileActions.getCurrentPermissions());
		var file = FileActions.getCurrentFile();
		if ($('tr').filterAttr('data-file', file).data('renaming')) {
			return;
		}
		var defaultAction = FileActions.getDefault(FileActions.getCurrentMimeType(), FileActions.getCurrentType(), FileActions.getCurrentPermissions());

		var actionHandler = function (event) {
			event.stopPropagation();
			event.preventDefault();

			FileActions.currentFile = event.data.elem;
			var file = FileActions.getCurrentFile();

			event.data.actionFunc(file);
		};

		var addAction = function (name, action) {
			// NOTE: Temporary fix to prevent rename action in root of Shared directory
			if (name === 'Rename' && $('#dir').val() === '/Shared') {
				return true;
			}

			if (name === 'Rename' || action !== defaultAction || name === 'Delete' || name === 'Download') {
				var img = FileActions.icons[name];
				if (img.call) {
					img = img(file);
				}
				if (name === 'Versions' || name === 'Download')
				{
					var html = '<img class ="svg" src="' + img + '" /> ';
				}
				else {
					var html = '<a href="#" class="action" data-action="' + name + '">';
					if (img) {
						html += '<img class ="svg" src="' + img + '" /> ';
						html += '<span>' + t('files', name) + '</span></a>';
					}					
				}
				var element = $(html);
				element.data('action', name);
				//alert(element);
				element.on('click', {a: null, elem: parent, actionFunc: actions[name]}, actionHandler);
                                if (name === 'Rename') {
                                    parent.find('a.name').append(element);
									parent.find('label.name').append(element);
                                }
                                else if (name === 'Download') {                                   
                                    parent.parent().find('td.filesize').append(element);
                                }
                                else if (name === 'Versions') {
                                    parent.parent().children().find('a.modified').append(element);
                                }
                                else if (name === 'Share') {
                                    parent.parent().find('a.name').append('<span class="share-icon" />');
                                    parent.parent().find('a.name>span.share-icon').append(element);
                                    parent.parent().find('label.name').append('<span class="share-icon" />');
                                    parent.parent().find('label.name>span.share-icon').append(element);
                                }
			}

		};

		$.each(actions, function (name, action) {
			if (name !== 'Share') {
				addAction(name, action);
			}
		});
		if(actions.Share && !($('#dir').val() === '/' && file === 'Shared')){
			addAction('Share', actions.Share);
		}

		if (actions['Delete']) {
			var img = FileActions.icons['Delete'];
			if (img.call) {
				img = img(file);
			}
			if (typeof trashBinApp !== 'undefined' && trashBinApp) {
				var html = '<a href="#" original-title="' + t('files', 'Delete permanently') + '" class="action delete" />';
			} else {
				var html = '<a href="#" original-title="' + t('files', 'Delete') + '" class="action delete" />';
			}
			var element = $(html);
			if (img) {
				element.append($('<img class ="svg" src="' + img + '"/>'));
			}
			element.data('action', actions['Delete']);
			element.on('click', {a: null, elem: parent, actionFunc: actions['Delete']}, actionHandler);
			parent.parent().children().last().append(element);
		}
	},
	getCurrentFile: function () {
		return FileActions.currentFile.parent().attr('data-file');
	},
	getCurrentMimeType: function () {
		return FileActions.currentFile.parent().attr('data-mime');
	},
	getCurrentType: function () {
		return FileActions.currentFile.parent().attr('data-type');
	},
	getCurrentPermissions: function () {
		return FileActions.currentFile.parent().data('permissions');
	}
};

$(document).ready(function () {
	if ($('#allowZipDownload').val() == 1) {
		var downloadScope = 'all';
	} else {
		var downloadScope = 'file';
	}

	if (typeof disableDownloadActions == 'undefined' || !disableDownloadActions) {
		FileActions.register(downloadScope, 'Download', OC.PERMISSION_READ, function () {
			return OC.imagePath('core', 'actions/download');
		}, function (filename) {
			window.location = OC.filePath('files', 'ajax', 'download.php') + '?files=' + encodeURIComponent(filename) + '&dir=' + encodeURIComponent($('#dir').val());
		});
	}

	$('#fileList tr').each(function () {
		FileActions.display($(this).children('td.filename'));
	});

});

FileActions.register('all', 'Delete', OC.PERMISSION_DELETE, function () {
	return OC.imagePath('core', 'actions/delete');
}, function (filename) {
	if (Files.cancelUpload(filename)) {
		if (filename.substr) {
			filename = [filename];
		}
		$.each(filename, function (index, file) {
			var filename = $('tr').filterAttr('data-file', file);
			filename.hide();
			filename.find('input[type="checkbox"]').removeAttr('checked');
			filename.removeClass('selected');
		});
		procesSelection();
	} else {
		FileList.do_delete(filename);
	}
	$('.tipsy').remove();
});

// t('files', 'Rename')
FileActions.register('all', 'Rename', OC.PERMISSION_UPDATE, function () {
	return OC.imagePath('core', 'actions/rename');
}, function (filename) {
	FileList.rename(filename);
});


FileActions.register('dir', 'Open', OC.PERMISSION_READ, '', function (filename) {
	window.location = OC.linkTo('files', 'index.php') + '?dir=' + encodeURIComponent($('#dir').val()).replace(/%2F/g, '/') + '/' + encodeURIComponent(filename);
});

FileActions.setDefault('dir', 'Open');
