/**
 * @author zhixin wen <wenzhixin2010@gmail.com>
 * extensions: https://github.com/vitalets/x-editable
 */

!function ($) {

    'use strict';

    $.extend($.fn.bootstrapTable.defaults, {
        editable: true,
        onEditableInit: function () {
            return false;
        },
        onEditableSave: function (field, row, oldValue, $el) {
           return false;
        },
        onEditableShown: function (field, row, $el, editable) {
            $el.parent('td').find('button[data-name="dereference-' + field + '"]').hide();

            return false;
        },
        onEditableHidden: function (field, row, $el, reason) {
            $el.parent('td').find('button[data-name="dereference-' + field + '"]').show();

            return false;
        },
        dereference: true,
        onDereferenceInit: function () {
            return false;
        },
    });

    $.extend($.fn.bootstrapTable.Constructor.EVENTS, {
        'editable-init.bs.table': 'onEditableInit',
        'editable-save.bs.table': 'onEditableSave',
        'editable-shown.bs.table': 'onEditableShown',
        'editable-hidden.bs.table': 'onEditableHidden',
        'dereference-init.bs.table': 'onDereferenceInit'
    });

    var BootstrapTable = $.fn.bootstrapTable.Constructor,
        _initTable = BootstrapTable.prototype.initTable,
        _initBody = BootstrapTable.prototype.initBody;

    BootstrapTable.prototype.initTable = function () {
        var that = this;
        _initTable.apply(this, Array.prototype.slice.apply(arguments));

        if (this.options.editable || this.options.dereference) {
            $.each(this.columns, function (i, column) {
                if (!column.editable && !column.dereference) {
                    return;
                }

                var editableOptions = {}, editableDataMarkup = [], editableDataPrefix = 'editable-';
                var editableProcessDataOptions = function(key, value) {
                  // Replace camel case with dashes.
                  var dashKey = key.replace(/([A-Z])/g, function($1){return "-"+$1.toLowerCase();});
                  if (dashKey.slice(0, editableDataPrefix.length) == editableDataPrefix) {
                    var dataKey = dashKey.replace(editableDataPrefix, 'data-');
                    editableOptions[dataKey] = value;
                  }
                };
                $.each(that.options, editableProcessDataOptions);

                var dereferenceOptions = {}, dereferenceDataMarkup = [], dereferenceDataPrefix = 'dereference-';
                var dereferenceProcessDataOptions = function(key, value) {
                  // Replace camel case with dashes.
                  var dashKey = key.replace(/([A-Z])/g, function($1){return "-"+$1.toLowerCase();});
                  if (dashKey.slice(0, dereferenceDataPrefix.length) == dereferenceDataPrefix) {
                    var dataKey = dashKey.replace(dereferenceDataPrefix, 'data-');
                    dereferenceOptions[dataKey] = value;
                  }
                };
                $.each(that.options, dereferenceProcessDataOptions);

                var _formatter = column.formatter;
                column.formatter = function (value, row, index) {
                    var result = _formatter ? _formatter(value, row, index) : value;

                    var data = '';
                    if (column.editable) {
                      $.each(column, editableProcessDataOptions);

                      $.each(editableOptions, function (key, value) {
                          editableDataMarkup.push(' ' + key + '="' + value + '"');
                      });

                      data +=
                        [
                          '<a href="javascript:void(0)"',
                          ' data-name="' + column.field + '"',
                          ' data-pk="' + row[that.options.idField] + '"',
                          ' data-value="' + result + '"',
                          editableDataMarkup.join(''),
                          '>' + '</a>'
                        ].join('');
                    }

                    if (column.dereference) {
                      $.each(column, dereferenceProcessDataOptions);

                      $.each(dereferenceOptions, function (key, value) {
                          dereferenceDataMarkup.push(' ' + key + '="' + value + '"');
                      });

                      data +=
                        [
                          ' <a href="javascript:void(0)"',
                          ' data-name="dereference-' + column.field + '"',
                          ' data-value="' + result + '"',
                          dereferenceDataMarkup.join(''),
                          '> ',
                          '<i class="glyphicon glyphicon-link"></i>',
                          '</button>'
                        ].join('');
                    }

                    return data;
                };
            });
        }
    };

    BootstrapTable.prototype.initBody = function () {
        var that = this;
        _initBody.apply(this, Array.prototype.slice.apply(arguments));

        // Editable cells
        if (this.options.editable) {
            $.each(this.columns, function (i, column) {
                if (!column.editable) {
                    return;
                }

                var data = that.getData();
                var editables = that.$body.find('a[data-name="' + column.field + '"]');

                editables
                    .each(function() {
                        if (typeof(column.editable) == 'function') {
                            var row = data[$(this).parents('tr[data-index]').data('index')];
                            $(this).editable(column.editable(row, column.field));
                        }
                        else {
                            $(this).editable(column.editable)
                        }
                    })
                    .off('save').on('save', function (e, params) {
                        var row = data[$(this).parents('tr[data-index]').data('index')];
                        var oldValue = row[column.field];

                        $(this).data('value', params.submitValue);
                        row[column.field] = params.submitValue;
                        that.trigger('editable-save', column.field, row, oldValue, $(this));
                    });
                editables
                    .each(function() {
                        if (typeof(column.editable) == 'function') {
                            var row = data[$(this).parents('tr[data-index]').data('index')];
                            $(this).editable(column.editable(row, column.field));
                        }
                        else {
                            $(this).editable(column.editable)
                        }
                    })
                    .off('shown').on('shown', function (e, editable) {
                        var row = data[$(this).parents('tr[data-index]').data('index')];
                        that.trigger('editable-shown', column.field, row, $(this), editable);
                    });
                editables
                    .each(function() {
                        if (typeof(column.editable) == 'function') {
                            var row = data[$(this).parents('tr[data-index]').data('index')];
                            $(this).editable(column.editable(row, column.field));
                        }
                        else {
                            $(this).editable(column.editable)
                        }
                    })
                    .off('hidden').on('hidden', function (e, reason) {
                        var row = data[$(this).parents('tr[data-index]').data('index')];
                        that.trigger('editable-hidden', column.field, row, $(this), reason);
                    });
            });
            this.trigger('editable-init');
        }

        //
        if (this.options.dereference) {
            $.each(this.columns, function (i, column) {
                if (!column.dereference) {
                    return;
                }

                var data = that.getData();
                var dereferences = that.$body.find('a[data-name="dereference-' + column.field + '"]');

                dereferences
                    .off('click').on('click', function (dereference) {
                        return function (e, params) {
                          if (typeof(dereference) == 'function') {
                              dereference($(this).attr('data-value'));
                          }
                          else {
                              console.log('Bad dereference definition');
                          }
                       };
                    }(column.dereference));
            });
            this.trigger('dereference-init');
        }
    };

}(jQuery);
