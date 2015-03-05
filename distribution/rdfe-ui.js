;(function(Form) {

  /**
   * List editor
   *
   * An array editor. Creates a list of other editor items.
   *
   * Special options:
   * @param {String} [options.schema.itemType]          The editor type for each item in the list. Default: 'Text'
   * @param {String} [options.schema.confirmDelete]     Text to display in a delete confirmation dialog. If falsey, will not ask for confirmation.
   */
  Form.editors.List = Form.editors.Base.extend({

    events: {
      'click [data-action="add"]:last': function(event) {
        event.preventDefault();
        this.addItem(null, true);
      }
    },

    initialize: function(options) {
      options = options || {};

      var editors = Form.editors;

      editors.Base.prototype.initialize.call(this, options);

      var schema = this.schema;
      if (!schema) throw new Error("Missing required option 'schema'");

      this.template = options.template || this.constructor.template;

      //Determine the editor to use
      this.Editor = (function() {
        var type = schema.itemType;

        //Default to Text
        if (!type) return editors.Text;

        //Use List-specific version if available
        if (editors.List[type]) return editors.List[type];

        //Or whichever was passed
        return editors[type];
      })();

      this.items = [];
    },

    render: function() {
      var self = this,
          value = this.value || [],
          $ = Backbone.$;

      //Create main element
      var $el = $($.trim(this.template()));

      //Store a reference to the list (item container)
      this.$list = $el.is('[data-items]') ? $el : $el.find('[data-items]');

      //Add existing items
      if (value.length) {
        _.each(value, function(itemValue) {
          self.addItem(itemValue);
        });
      }

      //If no existing items create an empty one, unless the editor specifies otherwise
      else {
        if (!this.Editor.isAsync) this.addItem();
      }

      // hide the "add" button in case the cardinality has been reached
      if (self.schema.maxCardinality && self.items.length >= self.schema.maxCardinality) {
        // we only hide the last button we find to not influence any nested list editors.
        $el.find('button[data-action="add"]:last').hide();
      }

      this.setElement($el);
      this.$el.attr('id', this.id);
      this.$el.attr('name', this.key);

      if (this.hasFocus) this.trigger('blur', this);

      return this;
    },

    /**
     * Add a new item to the list
     * @param {Mixed} [value]           Value for the new item editor
     * @param {Boolean} [userInitiated] If the item was added by the user clicking 'add'
     */
    addItem: function(value, userInitiated) {
      var self = this,
          editors = Form.editors;

      //Create the item
      var item = new editors.List.Item({
        list: this,
        form: this.form,
        schema: this.schema,
        value: value,
        Editor: this.Editor,
        key: this.key
      }).render();

      var _addItem = function() {
        self.items.push(item);
        self.$list.append(item.el);

        // hide the "add" button in case the cardinality has been reached
        if (self.schema.maxCardinality && self.items.length >= self.schema.maxCardinality) {
          // we only hide the last button we find to not influence any nested list editors.
          self.$el.find('button[data-action="add"]:last').hide();
        }

        item.editor.on('all', function(event) {
          if (event === 'change') return;

          // args = ["key:change", itemEditor, fieldEditor]
          var args = _.toArray(arguments);
          args[0] = 'item:' + event;
          args.splice(1, 0, self);
          // args = ["item:key:change", this=listEditor, itemEditor, fieldEditor]

          editors.List.prototype.trigger.apply(this, args);
        }, self);

        item.editor.on('change', function() {
          if (!item.addEventTriggered) {
            item.addEventTriggered = true;
            this.trigger('add', this, item.editor);
          }
          this.trigger('item:change', this, item.editor);
          this.trigger('change', this);
        }, self);

        item.editor.on('focus', function() {
          if (this.hasFocus) return;
          this.trigger('focus', this);
        }, self);
        item.editor.on('blur', function() {
          if (!this.hasFocus) return;
          var self = this;
          setTimeout(function() {
            if (_.find(self.items, function(item) { return item.editor.hasFocus; })) return;
            self.trigger('blur', self);
          }, 0);
        }, self);

        if (userInitiated || value) {
          item.addEventTriggered = true;
        }

        if (userInitiated) {
          self.trigger('add', self, item.editor);
          self.trigger('change', self);
        }
      };

      //Check if we need to wait for the item to complete before adding to the list
      if (this.Editor.isAsync) {
        item.editor.on('readyToAdd', _addItem, this);
      }

      //Most editors can be added automatically
      else {
        _addItem();
        item.editor.focus();
      }

      return item;
    },

    /**
     * Remove an item from the list
     * @param {List.Item} item
     */
    removeItem: function(item) {
      //Confirm delete
      var confirmMsg = this.schema.confirmDelete;
      if (confirmMsg && !confirm(confirmMsg)) return;

      var index = _.indexOf(this.items, item);

      this.items[index].remove();
      this.items.splice(index, 1);

      if (item.addEventTriggered) {
        this.trigger('remove', this, item.editor);
        this.trigger('change', this);
      }

      if (!this.items.length && !this.Editor.isAsync) this.addItem();

      // show the "add" button in case the cardinality has not been reached
      if (this.schema.maxCardinality && this.items.length < this.schema.maxCardinality) {
        // we only show the last button we find to not influence any nested list editors.
        this.$el.find('button[data-action="add"]:last').show();
      }
    },

    getValue: function() {
      var values = _.map(this.items, function(item) {
        return item.getValue();
      });

      //Filter empty items
      return _.without(values, undefined, '');
    },

    setValue: function(value) {
      this.value = value;
      this.render();
    },

    focus: function() {
      if (this.hasFocus) return;

      if (this.items[0]) this.items[0].editor.focus();
    },

    blur: function() {
      if (!this.hasFocus) return;

      var focusedItem = _.find(this.items, function(item) { return item.editor.hasFocus; });

      if (focusedItem) focusedItem.editor.blur();
    },

    /**
     * Override default remove function in order to remove item views
     */
    remove: function() {
      _.invoke(this.items, 'remove');

      Form.editors.Base.prototype.remove.call(this);
    },

    /**
     * Run validation
     *
     * @return {Object|Null}
     */
    validate: function() {
      if (!this.validators) return null;

      //Collect errors
      var errors = _.map(this.items, function(item) {
        return item.validate();
      });

      //Check if any item has errors
      var hasErrors = _.compact(errors).length ? true : false;
      if (!hasErrors) return null;

      //If so create a shared error
      var fieldError = {
        type: 'list',
        message: 'Some of the items in the list failed validation',
        errors: errors
      };

      return fieldError;
    }
  }, {

    //STATICS
    template: _.template('\
      <div>\
        <div data-items></div>\
        <button type="button" data-action="add">Add</button>\
      </div>\
    ', null, Form.templateSettings)

  });


  /**
   * A single item in the list
   *
   * @param {editors.List} options.list The List editor instance this item belongs to
   * @param {Function} options.Editor   Editor constructor function
   * @param {String} options.key        Model key
   * @param {Mixed} options.value       Value
   * @param {Object} options.schema     Field schema
   */
  Form.editors.List.Item = Form.editors.Base.extend({

    events: {
      'click [data-action="remove"]:last': function(event) {
        event.preventDefault();
        this.list.removeItem(this);
      },
      'keydown input[type=text]': function(event) {
        if(event.keyCode !== 13) return;
        event.preventDefault();
        // FIXME: make this configurable instead of just commenting it out
//         this.list.addItem();
//         this.list.$list.find("> li:last input").focus();
      }
    },

    initialize: function(options) {
      this.list = options.list;
      this.schema = options.schema || this.list.schema;
      this.value = options.value;
      this.Editor = options.Editor || Form.editors.Text;
      this.key = options.key;
      this.template = options.template || this.schema.itemTemplate || this.constructor.template;
      this.errorClassName = options.errorClassName || this.constructor.errorClassName;
      this.form = options.form;
    },

    render: function() {
      var $ = Backbone.$;

      //Create editor
      this.editor = new this.Editor({
        key: this.key,
        schema: this.schema,
        value: this.value,
        list: this.list,
        item: this,
        form: this.form
      }).render();

      //Create main element
      var $el = $($.trim(this.template()));

      $el.find('[data-editor]').append(this.editor.el);

      //Replace the entire element so there isn't a wrapper tag
      this.setElement($el);

      return this;
    },

    getValue: function() {
      return this.editor.getValue();
    },

    setValue: function(value) {
      this.editor.setValue(value);
    },

    focus: function() {
      this.editor.focus();
    },

    blur: function() {
      this.editor.blur();
    },

    remove: function() {
      this.editor.remove();

      Backbone.View.prototype.remove.call(this);
    },

    validate: function() {
      var value = this.getValue(),
          formValues = this.list.form ? this.list.form.getValue() : {},
          validators = this.schema.validators,
          getValidator = this.getValidator;

      if (!validators) return null;

      //Run through validators until an error is found
      var error = null;
      _.every(validators, function(validator) {
        error = getValidator(validator)(value, formValues);

        return error ? false : true;
      });

      //Show/hide error
      if (error){
        this.setError(error);
      } else {
        this.clearError();
      }

      //Return error to be aggregated by list
      return error ? error : null;
    },

    /**
     * Show a validation error
     */
    setError: function(err) {
      this.$el.addClass(this.errorClassName);
      this.$el.attr('title', err.message);
    },

    /**
     * Hide validation errors
     */
    clearError: function() {
      this.$el.removeClass(this.errorClassName);
      this.$el.attr('title', null);
    }
  }, {

    //STATICS
    template: _.template('\
      <div>\
        <span data-editor></span>\
        <button type="button" data-action="remove">&times;</button>\
      </div>\
    ', null, Form.templateSettings),

    errorClassName: 'error'

  });


  /**
   * Base modal object editor for use with the List editor; used by Object
   * and NestedModal list types
   */
  Form.editors.List.Modal = Form.editors.Base.extend({

    events: {
      'click': 'openEditor'
    },

    /**
     * @param {Object} options
     * @param {Form} options.form                       The main form
     * @param {Function} [options.schema.itemToString]  Function to transform the value for display in the list.
     * @param {String} [options.schema.itemType]        Editor type e.g. 'Text', 'Object'.
     * @param {Object} [options.schema.subSchema]       Schema for nested form,. Required when itemType is 'Object'
     * @param {Function} [options.schema.model]         Model constructor function. Required when itemType is 'NestedModel'
     */
    initialize: function(options) {
      options = options || {};

      Form.editors.Base.prototype.initialize.call(this, options);

      //Dependencies
      if (!Form.editors.List.Modal.ModalAdapter) throw new Error('A ModalAdapter is required');

      this.form = options.form;
      if (!options.form) throw new Error('Missing required option: "form"');

      //Template
      this.template = options.template || this.constructor.template;
    },

    /**
     * Render the list item representation
     */
    render: function() {
      var self = this;

      //New items in the list are only rendered when the editor has been OK'd
      if (_.isEmpty(this.value)) {
        this.openEditor();
      }

      //But items with values are added automatically
      else {
        this.renderSummary();

        setTimeout(function() {
          self.trigger('readyToAdd');
        }, 0);
      }

      if (this.hasFocus) this.trigger('blur', this);

      return this;
    },

    /**
     * Renders the list item representation
     */
    renderSummary: function() {
      this.$el.html($.trim(this.template({
        summary: this.getStringValue()
      })));
    },

    /**
     * Function which returns a generic string representation of an object
     *
     * @param {Object} value
     *
     * @return {String}
     */
    itemToString: function(value) {
      var createTitle = function(key) {
        var context = { key: key };

        return Form.Field.prototype.createTitle.call(context);
      };

      value = value || {};

      //Pretty print the object keys and values
      var parts = [];
      _.each(this.nestedSchema, function(schema, key) {
        var desc = schema.title ? schema.title : createTitle(key),
            val = value[key];

        if (_.isUndefined(val) || _.isNull(val)) val = '';

        parts.push(desc + ': ' + val);
      });

      return parts.join('<br />');
    },

    /**
     * Returns the string representation of the object value
     */
    getStringValue: function() {
      var schema = this.schema,
          value = this.getValue();

      if (_.isEmpty(value)) return '[Empty]';

      //If there's a specified toString use that
      if (schema.itemToString) return schema.itemToString(value);

      //Otherwise use the generic method or custom overridden method
      return this.itemToString(value);
    },

    openEditor: function() {
      var self = this,
          ModalForm = this.form.constructor;

      var form = this.modalForm = new ModalForm({
        schema: this.nestedSchema,
        data: this.value
      });

      var modal = this.modal = new Form.editors.List.Modal.ModalAdapter({
        content: form,
        animate: true
      });

      modal.open();

      this.trigger('open', this);
      this.trigger('focus', this);

      modal.on('cancel', this.onModalClosed, this);

      modal.on('ok', _.bind(this.onModalSubmitted, this));
    },

    /**
     * Called when the user clicks 'OK'.
     * Runs validation and tells the list when ready to add the item
     */
    onModalSubmitted: function() {
      var modal = this.modal,
          form = this.modalForm,
          isNew = !this.value;

      //Stop if there are validation errors
      var error = form.validate();
      if (error) return modal.preventClose();

      //Store form value
      this.value = form.getValue();

      //Render item
      this.renderSummary();

      if (isNew) this.trigger('readyToAdd');

      this.trigger('change', this);

      this.onModalClosed();
    },

    /**
     * Cleans up references, triggers events. To be called whenever the modal closes
     */
    onModalClosed: function() {
      this.modal = null;
      this.modalForm = null;

      this.trigger('close', this);
      this.trigger('blur', this);
    },

    getValue: function() {
      return this.value;
    },

    setValue: function(value) {
      this.value = value;
    },

    focus: function() {
      if (this.hasFocus) return;

      this.openEditor();
    },

    blur: function() {
      if (!this.hasFocus) return;

      if (this.modal) {
        this.modal.trigger('cancel');
      }
    }
  }, {
    //STATICS
    template: _.template('\
      <div><%= summary %></div>\
    ', null, Form.templateSettings),

    //The modal adapter that creates and manages the modal dialog.
    //Defaults to BootstrapModal (http://github.com/powmedia/backbone.bootstrap-modal)
    //Can be replaced with another adapter that implements the same interface.
    ModalAdapter: Backbone.BootstrapModal,

    //Make the wait list for the 'ready' event before adding the item to the list
    isAsync: true
  });


  Form.editors.List.Object = Form.editors.List.Modal.extend({
    initialize: function () {
      Form.editors.List.Modal.prototype.initialize.apply(this, arguments);

      var schema = this.schema;

      if (!schema.subSchema) throw new Error('Missing required option "schema.subSchema"');

      this.nestedSchema = schema.subSchema;
    }
  });


  Form.editors.List.NestedModel = Form.editors.List.Modal.extend({
    initialize: function() {
      Form.editors.List.Modal.prototype.initialize.apply(this, arguments);

      var schema = this.schema;

      if (!schema.model) throw new Error('Missing required option "schema.model"');

      var nestedSchema = schema.model.prototype.schema;

      this.nestedSchema = (_.isFunction(nestedSchema)) ? nestedSchema() : nestedSchema;
    },

    /**
     * Returns the string representation of the object value
     */
    getStringValue: function() {
      var schema = this.schema,
          value = this.getValue();

      if (_.isEmpty(value)) return null;

      //If there's a specified toString use that
      if (schema.itemToString) return schema.itemToString(value);

      //Otherwise use the model
      return new (schema.model)(value).toString();
    }
  });

})(Backbone.Form);

/**
 * Include this template file after backbone-forms.amd.js to override the default templates
 *
 * 'data-*' attributes control where elements are placed
 */
;(function(Form) {


  /**
   * Bootstrap 3 templates
   */
  Form.template = _.template('\
    <form class="form-horizontal" role="form">\
      <div data-fieldsets></div>\
      <% if (submitButton) { %>\
        <button type="submit" class="btn"><%= submitButton %></button>\
      <% } %>\
    </form>\
  ');


  Form.Fieldset.template = _.template('\
    <fieldset data-fields>\
      <% if (legend) { %>\
        <legend><%= legend %></legend>\
      <% } %>\
    </fieldset>\
  ');


  Form.Field.template = _.template('\
    <div class="form-group field-<%= key %>">\
      <label class="col-sm-2 control-label" for="<%= editorId %>">\
        <% if (titleHTML){ %><%= titleHTML %>\
        <% } else { %><%- title %><% } %>\
      </label>\
      <div class="col-sm-10">\
        <span data-editor></span>\
        <p class="help-block" data-error></p>\
        <p class="help-block"><%= help %></p>\
      </div>\
    </div>\
  ');


  Form.NestedField.template = _.template('\
    <div class="field-<%= key %>">\
      <div title="<% if (titleHTML){ %><%= titleHTML %><% } else { %><%- title %><% } %>" class="input-xlarge">\
        <span data-editor></span>\
        <div class="help-inline" data-error></div>\
      </div>\
      <div class="help-block"><%= help %></div>\
    </div>\
  ');

  Form.editors.Base.prototype.className = 'form-control';
  Form.Field.errorClassName = 'has-error';


  if (Form.editors.List) {

    Form.editors.List.template = _.template('\
      <div class="bbf-list">\
        <div class="bbf-list-contents">\
          <ul class="list-unstyled clearfix" data-items></ul>\
        </div>\
        <div class="bbf-list-buttons">\
          <button type="button" class="btn btn-default bbf-add" data-action="add"><span class="glyphicon glyphicon-plus"></span> add value</button>\
        </div>\
      </div>\
    ');


    Form.editors.List.Item.template = _.template('\
      <li class="clearfix">\
        <div class="input-group">\
          <div data-editor></div>\
          <span class="input-group-btn">\
            <button type="button" class="btn btn-default bbf-del" data-action="remove">&times;</button>\
          </span>\
        </div>\
      </li>\
    ');


    Form.editors.List.Object.template = Form.editors.List.NestedModel.template = _.template('\
      <div class="bbf-list-modal"><%= summary %></div>\
    ');

  }


})(Backbone.Form);

/**
 * @author zhixin wen <wenzhixin2010@gmail.com>
 * version: 1.6.0
 * https://github.com/wenzhixin/bootstrap-table/
 */

!function ($) {

    'use strict';

    // TOOLS DEFINITION
    // ======================

    // it only does '%s', and return '' when arguments are undefined
    var sprintf = function(str) {
        var args = arguments,
            flag = true,
            i = 1;

        str = str.replace(/%s/g, function () {
            var arg = args[i++];

            if (typeof arg === 'undefined') {
                flag = false;
                return '';
            }
            return arg;
        });
        return flag ? str : '';
    };

    var getPropertyFromOther = function (list, from, to, value) {
        var result = '';
        $.each(list, function (i, item) {
            if (item[from] === value) {
                result = item[to];
                return false;
            }
            return true;
        });
        return result;
    };

    var getFieldIndex = function (columns, field) {
        var index = -1;

        $.each(columns, function (i, column) {
            if (column.field === field) {
                index = i;
                return false;
            }
            return true;
        });
        return index;
    };

    var getScrollBarWidth = function () {
        var inner = $('<p/>').addClass('fixed-table-scroll-inner'),
            outer = $('<div/>').addClass('fixed-table-scroll-outer'),
            w1, w2;

        outer.append(inner);
        $('body').append(outer);

        w1 = inner[0].offsetWidth;
        outer.css('overflow', 'scroll');
        w2 = inner[0].offsetWidth;

        if (w1 === w2) {
            w2 = outer[0].clientWidth;
        }

        outer.remove();
        return w1 - w2;
    };

    var calculateObjectValue = function (self, name, args, defaultValue) {
        if (typeof name === 'string') {
            // support obj.func1.func2
            var names = name.split('.');

            if (names.length > 1) {
                name = window;
                $.each(names, function (i, f) {
                    name = name[f];
                });
            } else {
                name = window[name];
            }
        }
        if (typeof name === 'object') {
            return name;
        }
        if (typeof name === 'function') {
            return name.apply(self, args);
        }
        return defaultValue;
    };

    var escapeHTML = function (text) {
        if (typeof text === 'string') {
            return text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
        return text;
    };

    // BOOTSTRAP TABLE CLASS DEFINITION
    // ======================

    var BootstrapTable = function (el, options) {
        this.options = options;
        this.$el = $(el);
        this.$el_ = this.$el.clone();
        this.timeoutId_ = 0;

        this.init();
    };

    BootstrapTable.DEFAULTS = {
        classes: 'table table-hover',
        height: undefined,
        undefinedText: '-',
        sortName: undefined,
        sortOrder: 'asc',
        striped: false,
        columns: [],
        data: [],
        method: 'get',
        url: undefined,
        cache: true,
        contentType: 'application/json',
        dataType: 'json',
        ajaxOptions: {},
        queryParams: function (params) {return params;},
        queryParamsType: 'limit', // undefined
        responseHandler: function (res) {return res;},
        pagination: false,
        sidePagination: 'client', // client or server
        totalRows: 0, // server side need to set
        pageNumber: 1,
        pageSize: 10,
        pageList: [10, 25, 50, 100],
        search: false,
        searchAlign: 'right',
        selectItemName: 'btSelectItem',
        showHeader: true,
        showColumns: false,
        showPaginationSwitch: false,
        showRefresh: false,
        showToggle: false,
        buttonsAlign: 'right',
        smartDisplay: true,
        minimumCountColumns: 1,
        idField: undefined,
        cardView: false,
        trimOnSearch: true,
        clickToSelect: false,
        singleSelect: false,
        toolbar: undefined,
        toolbarAlign: 'left',
        checkboxHeader: true,
        sortable: true,
        maintainSelected: false,
        searchTimeOut: 500,
        iconSize: undefined,
        iconsPrefix: 'glyphicon', // glyphicon of fa (font awesome)
        icons: {
            paginationSwitchDown: 'glyphicon-collapse-down icon-chevron-down',
            paginationSwitchUp: 'glyphicon-collapse-up icon-chevron-up',
            refresh: 'glyphicon-refresh icon-refresh',
            toggle: 'glyphicon-list-alt icon-list-alt',
            columns: 'glyphicon-th icon-th'
        },

        rowStyle: function (row, index) {return {};},

        rowAttributes: function (row, index) {return {};},

        onAll: function (name, args) {return false;},
        onClickRow: function (item, $element) {return false;},
        onDblClickRow: function (item, $element) {return false;},
        onSort: function (name, order) {return false;},
        onCheck: function (row) {return false;},
        onUncheck: function (row) {return false;},
        onCheckAll: function () {return false;},
        onUncheckAll: function () {return false;},
        onLoadSuccess: function (data) {return false;},
        onLoadError: function (status) {return false;},
        onColumnSwitch: function (field, checked) {return false;},
        onPageChange: function (number, size) {return false;},
        onSearch: function (text) {return false;},
        onPreBody: function (data) {return false;},
        onPostBody: function () {return false;}
    };

    BootstrapTable.LOCALES = [];

    BootstrapTable.LOCALES['en-US'] = {
        formatLoadingMessage: function () {
            return 'Loading, please wait...';
        },
        formatRecordsPerPage: function (pageNumber) {
            return sprintf('%s records per page', pageNumber);
        },
        formatShowingRows: function (pageFrom, pageTo, totalRows) {
            return sprintf('Showing %s to %s of %s rows', pageFrom, pageTo, totalRows);
        },
        formatSearch: function () {
            return 'Search';
        },
        formatNoMatches: function () {
            return 'No matching records found';
        },
        formatPaginationSwitch: function () {
            return 'Hide/Show pagination';
        },
        formatRefresh: function () {
            return 'Refresh';
        },
        formatToggle: function () {
            return 'Toggle';
        },
        formatColumns: function () {
            return 'Columns';
        }
    };

    $.extend(BootstrapTable.DEFAULTS, BootstrapTable.LOCALES['en-US']);

    BootstrapTable.COLUMN_DEFAULTS = {
        radio: false,
        checkbox: false,
        checkboxEnabled: true,
        field: undefined,
        title: undefined,
        'class': undefined,
        align: undefined, // left, right, center
        halign: undefined, // left, right, center
        valign: undefined, // top, middle, bottom
        width: undefined,
        sortable: false,
        order: 'asc', // asc, desc
        visible: true,
        switchable: true,
        clickToSelect: true,
        formatter: undefined,
        events: undefined,
        sorter: undefined,
        cellStyle: undefined,
        searchable: true
    };

    BootstrapTable.EVENTS = {
        'all.bs.table': 'onAll',
        'click-row.bs.table': 'onClickRow',
        'dbl-click-row.bs.table': 'onDblClickRow',
        'sort.bs.table': 'onSort',
        'check.bs.table': 'onCheck',
        'uncheck.bs.table': 'onUncheck',
        'check-all.bs.table': 'onCheckAll',
        'uncheck-all.bs.table': 'onUncheckAll',
        'load-success.bs.table': 'onLoadSuccess',
        'load-error.bs.table': 'onLoadError',
        'column-switch.bs.table': 'onColumnSwitch',
        'page-change.bs.table': 'onPageChange',
        'search.bs.table': 'onSearch',
        'pre-body.bs.table': 'onPreBody',
        'post-body.bs.table': 'onPostBody'
    };

    BootstrapTable.prototype.init = function () {
        this.initContainer();
        this.initTable();
        this.initHeader();
        this.initData();
        this.initToolbar();
        this.initPagination();
        this.initBody();
        this.initServer();
    };

    BootstrapTable.prototype.initContainer = function () {
        this.$container = $([
            '<div class="bootstrap-table">',
                '<div class="fixed-table-toolbar"></div>',
                '<div class="fixed-table-container">',
                    '<div class="fixed-table-header"><table></table></div>',
                    '<div class="fixed-table-body">',
                        '<div class="fixed-table-loading">',
                            this.options.formatLoadingMessage(),
                        '</div>',
                    '</div>',
                    '<div class="fixed-table-pagination"></div>',
                '</div>',
            '</div>'].join(''));

        this.$container.insertAfter(this.$el);
        this.$container.find('.fixed-table-body').append(this.$el);
        this.$container.after('<div class="clearfix"></div>');
        this.$loading = this.$container.find('.fixed-table-loading');

        this.$el.addClass(this.options.classes);
        if (this.options.striped) {
            this.$el.addClass('table-striped');
        }
    };

    BootstrapTable.prototype.initTable = function () {
        var that = this,
            columns = [],
            data = [];

        this.$header = this.$el.find('thead');
        if (!this.$header.length) {
            this.$header = $('<thead></thead>').appendTo(this.$el);
        }
        if (!this.$header.find('tr').length) {
            this.$header.append('<tr></tr>');
        }
        this.$header.find('th').each(function () {
            var column = $.extend({}, {
                title: $(this).html(),
                'class': $(this).attr('class')
            }, $(this).data());

            columns.push(column);
        });
        this.options.columns = $.extend([], columns, this.options.columns);
        $.each(this.options.columns, function (i, column) {
            that.options.columns[i] = $.extend({}, BootstrapTable.COLUMN_DEFAULTS,
                {field: i}, column); // when field is undefined, use index instead
        });

        // if options.data is setting, do not process tbody data
        if (this.options.data.length) {
            return;
        }

        this.$el.find('tbody tr').each(function () {
            var row = {};

            // save tr's id and class
            row._id = $(this).attr('id');
            row._class = $(this).attr('class');

            $(this).find('td').each(function (i) {
                var field = that.options.columns[i].field;

                row[field] = $(this).html();
                // save td's id and class
                row['_' + field + '_id'] = $(this).attr('id');
                row['_' + field + '_class'] = $(this).attr('class');
            });
            data.push(row);
        });
        this.options.data = data;
    };

    BootstrapTable.prototype.initHeader = function () {
        var that = this,
            visibleColumns = [],
            html = [];

        this.header = {
            fields: [],
            styles: [],
            classes: [],
            formatters: [],
            events: [],
            sorters: [],
            cellStyles: [],
            clickToSelects: [],
            searchables: []
        };
        $.each(this.options.columns, function (i, column) {
            var text = '',
                halign = '', // header align style
                align = '', // body align style
                style = '',
                class_ = sprintf(' class="%s"', column['class']),
                order = that.options.sortOrder || column.order,
                searchable = true;

            if (!column.visible) {
                return;
            }

            halign = sprintf('text-align: %s; ', column.halign ? column.halign : column.align);
            align = sprintf('text-align: %s; ', column.align);
            style = sprintf('vertical-align: %s; ', column.valign);
            style += sprintf('width: %spx; ', column.checkbox || column.radio ? 36 : column.width);

            visibleColumns.push(column);
            that.header.fields.push(column.field);
            that.header.styles.push(align + style);
            that.header.classes.push(class_);
            that.header.formatters.push(column.formatter);
            that.header.events.push(column.events);
            that.header.sorters.push(column.sorter);
            that.header.cellStyles.push(column.cellStyle);
            that.header.clickToSelects.push(column.clickToSelect);
            that.header.searchables.push(column.searchable);

            html.push('<th',
                column.checkbox || column.radio ?
                    sprintf(' class="bs-checkbox %s"', column['class'] || '') :
                    class_,
                sprintf(' style="%s"', halign + style),
                '>');
            html.push(sprintf('<div class="th-inner %s">', that.options.sortable && column.sortable ?
                'sortable' : ''));

            text = column.title;
            if (that.options.sortName === column.field && that.options.sortable && column.sortable) {
                text += that.getCaretHtml();
            }

            if (column.checkbox) {
                if (!that.options.singleSelect && that.options.checkboxHeader) {
                    text = '<input name="btSelectAll" type="checkbox" />';
                }
                that.header.stateField = column.field;
            }
            if (column.radio) {
                text = '';
                that.header.stateField = column.field;
                that.options.singleSelect = true;
            }

            html.push(text);
            html.push('</div>');
            html.push('<div class="fht-cell"></div>');
            html.push('</th>');
        });

        this.$header.find('tr').html(html.join(''));
        this.$header.find('th').each(function (i) {
            $(this).data(visibleColumns[i]);
        });
        this.$container.off('click', 'th').on('click', 'th', function (event) {
            if (that.options.sortable && $(this).data().sortable) {
                that.onSort(event);
            }
        });

        if (!this.options.showHeader || this.options.cardView) {
            this.$header.hide();
            this.$container.find('.fixed-table-header').hide();
            this.$loading.css('top', 0);
        } else {
            this.$header.show();
            this.$container.find('.fixed-table-header').show();
            this.$loading.css('top', '37px');
        }

        this.$selectAll = this.$header.find('[name="btSelectAll"]');
        this.$container.off('click', '[name="btSelectAll"]')
            .on('click', '[name="btSelectAll"]', function () {
                var checked = $(this).prop('checked');
                that[checked ? 'checkAll' : 'uncheckAll']();
            });
    };

    /**
     * @param data
     * @param type: append / prepend
     */
    BootstrapTable.prototype.initData = function (data, type) {
        if (type === 'append') {
            this.data = this.data.concat(data);
        } else if (type === 'prepend') {
            this.data = data.concat(this.data);
        } else {
            this.data = data || this.options.data;
        }
        this.options.data = this.data;

        if (this.options.sidePagination === 'server') {
            return;
        }
        this.initSort();
    };

    BootstrapTable.prototype.initSort = function () {
        var that = this,
            name = this.options.sortName,
            order = this.options.sortOrder === 'desc' ? -1 : 1,
            index = $.inArray(this.options.sortName, this.header.fields);

        if (index !== -1) {
            this.data.sort(function (a, b) {
                var aa = a[name],
                    bb = b[name],
                    value = calculateObjectValue(that.header, that.header.sorters[index], [aa, bb]);

                if (value !== undefined) {
                    return order * value;
                }

                // Convert numerical values form string to float.
                if ($.isNumeric(aa)) {
                    aa = parseFloat(aa);
                }
                if ($.isNumeric(bb)) {
                    bb = parseFloat(bb);
                }

                // Fix #161: undefined or null string sort bug.
                if (aa === undefined || aa === null) {
                    aa = '';
                }
                if (bb === undefined || bb === null) {
                    bb = '';
                }

                if ($.isNumeric(aa) && $.isNumeric(bb)) {
                    if (aa < bb) {
                        return order * -1;
                    }
                    return order;
                }

                if (aa === bb) {
                    return 0;
                }
                if (aa.localeCompare(bb) === -1) {
                    return order * -1;
                }

                return order;
            });
        }
    };

    BootstrapTable.prototype.onSort = function (event) {
        var $this = $(event.currentTarget),
            $this_ = this.$header.find('th').eq($this.index());

        this.$header.add(this.$header_).find('span.order').remove();

        if (this.options.sortName === $this.data('field')) {
            this.options.sortOrder = this.options.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.options.sortName = $this.data('field');
            this.options.sortOrder = $this.data('order') === 'asc' ? 'desc' : 'asc';
        }
        this.trigger('sort', this.options.sortName, this.options.sortOrder);

        $this.add($this_).data('order', this.options.sortOrder)
            .find('.th-inner').append(this.getCaretHtml());

        if (this.options.sidePagination === 'server') {
            this.initServer();
            return;
        }
        this.initSort();
        this.initBody();
    };

    BootstrapTable.prototype.initToolbar = function () {
        var that = this,
            html = [],
            timeoutId = 0,
            $keepOpen,
            $search,
            switchableCount = 0;

        this.$toolbar = this.$container.find('.fixed-table-toolbar').html('');

        if (typeof this.options.toolbar === 'string') {
            $(sprintf('<div class="bars pull-%s"></div>', this.options.toolbarAlign))
                .appendTo(this.$toolbar)
                .append($(this.options.toolbar));
        }

        // showColumns, showToggle, showRefresh
        html = [sprintf('<div class="columns columns-%s btn-group pull-%s">',
            this.options.buttonsAlign, this.options.buttonsAlign)];

        if (typeof this.options.icons === 'string') {
            this.options.icons = calculateObjectValue(null, this.options.icons);
        }

        if (this.options.showPaginationSwitch) {
            html.push(sprintf('<button class="btn btn-default" type="button" name="paginationSwitch" title="%s">',
                this.options.formatPaginationSwitch()),
                sprintf('<i class="%s %s"></i>', this.options.iconsPrefix, this.options.icons.paginationSwitchDown),
                '</button>');
        }

        if (this.options.showRefresh) {
            html.push(sprintf('<button class="btn btn-default' + (this.options.iconSize == undefined ? '' :  ' btn-' + this.options.iconSize) + '" type="button" name="refresh" title="%s">',
                this.options.formatRefresh()),
                sprintf('<i class="%s %s"></i>', this.options.iconsPrefix, this.options.icons.refresh),
                '</button>');
        }

        if (this.options.showToggle) {
            html.push(sprintf('<button class="btn btn-default' + (this.options.iconSize == undefined ? '' :  ' btn-' + this.options.iconSize) + '" type="button" name="toggle" title="%s">',
                this.options.formatToggle()),
                sprintf('<i class="%s %s"></i>', this.options.iconsPrefix, this.options.icons.toggle),
                '</button>');
        }

        if (this.options.showColumns) {
            html.push(sprintf('<div class="keep-open btn-group" title="%s">',
                this.options.formatColumns()),
                '<button type="button" class="btn btn-default' + (this.options.iconSize == undefined ? '' :  ' btn-' + this.options.iconSize) + ' dropdown-toggle" data-toggle="dropdown">',
                sprintf('<i class="%s %s"></i>', this.options.iconsPrefix, this.options.icons.columns),
                ' <span class="caret"></span>',
                '</button>',
                '<ul class="dropdown-menu" role="menu">');

            $.each(this.options.columns, function (i, column) {
                if (column.radio || column.checkbox) {
                    return;
                }
                var checked = column.visible ? ' checked="checked"' : '';

                if (column.switchable) {
                    html.push(sprintf('<li>' +
                        '<label><input type="checkbox" data-field="%s" value="%s"%s> %s</label>' +
                        '</li>', column.field, i, checked, column.title));
                    switchableCount++;
                }
            });
            html.push('</ul>',
                '</div>');
        }

        html.push('</div>');

        // Fix #188: this.showToolbar is for extentions
        if (this.showToolbar || html.length > 2) {
            this.$toolbar.append(html.join(''));
        }

        if (this.options.showPaginationSwitch) {
            this.$toolbar.find('button[name="paginationSwitch"]')
                .off('click').on('click', $.proxy(this.togglePagination, this));
        }

        if (this.options.showRefresh) {
            this.$toolbar.find('button[name="refresh"]')
                .off('click').on('click', $.proxy(this.refresh, this));
        }

        if (this.options.showToggle) {
            this.$toolbar.find('button[name="toggle"]')
                .off('click').on('click', function () {
                    that.options.cardView = !that.options.cardView;
                    that.initHeader();
                    that.initBody();
                });
        }

        if (this.options.showColumns) {
            $keepOpen = this.$toolbar.find('.keep-open');

            if (switchableCount <= this.options.minimumCountColumns) {
                $keepOpen.find('input').prop('disabled', true);
            }

            $keepOpen.find('li').off('click').on('click', function (event) {
                event.stopImmediatePropagation();
            });
            $keepOpen.find('input').off('click').on('click', function () {
                var $this = $(this);

                that.toggleColumn($this.val(), $this.prop('checked'), false);
                that.trigger('column-switch', $(this).data('field'), $this.prop('checked'));
            });
        }

        if (this.options.search) {
            html = [];
            html.push(
                '<div class="pull-' + this.options.searchAlign + ' search">',
                    sprintf('<input class="form-control' + (this.options.iconSize == undefined ? '' :  ' input-' + this.options.iconSize)  + '" type="text" placeholder="%s">',
                        this.options.formatSearch()),
                '</div>');

            this.$toolbar.append(html.join(''));
            $search = this.$toolbar.find('.search input');
            $search.off('keyup').on('keyup', function (event) {
                clearTimeout(timeoutId); // doesn't matter if it's 0
                timeoutId = setTimeout(function () {
                    that.onSearch(event);
                }, that.options.searchTimeOut);
            });
        }
    };

    BootstrapTable.prototype.onSearch = function (event) {
        var text = $.trim($(event.currentTarget).val());

        // trim search input
        if(this.options.trimOnSearch) {
            $(event.currentTarget).val(text);
        }

        if (text === this.searchText) {
            return;
        }
        this.searchText = text;

        this.options.pageNumber = 1;
        this.initSearch();
        this.updatePagination();
        this.trigger('search', text);
    };

    BootstrapTable.prototype.initSearch = function () {
        var that = this;

        if (this.options.sidePagination !== 'server') {
            var s = this.searchText && this.searchText.toLowerCase();
            var f = $.isEmptyObject(this.filterColumns) ? null: this.filterColumns;

            // Check filter
            this.data = f ? $.grep(this.options.data, function (item, i) {
                for (var key in f) {
                    if (item[key] !== f[key]) {
                        return false;
                    }
                }
                return true;
            }) : this.options.data;

            this.data = s ? $.grep(this.data, function (item, i) {
                for (var key in item) {
                    key = $.isNumeric(key) ? parseInt(key, 10) : key;
                    var value = item[key];

                    // Fix #142: search use formated data
                    value = calculateObjectValue(that.header,
                        that.header.formatters[$.inArray(key, that.header.fields)],
                        [value, item, i], value);

                    var index = $.inArray(key, that.header.fields);
                    if (index !== -1 && that.header.searchables[index] &&
                        (typeof value === 'string' ||
                        typeof value === 'number') &&
                        (value + '').toLowerCase().indexOf(s) !== -1) {
                        return true;
                    }
                }
                return false;
            }) : this.data;
        }
    };

    BootstrapTable.prototype.initPagination = function () {
        this.$pagination = this.$container.find('.fixed-table-pagination');

        if (!this.options.pagination) {
            this.$pagination.hide();
            return;
        } else {
            this.$pagination.show();
        }

        var that = this,
            html = [],
            i, from, to,
            $pageList,
            $first, $pre,
            $next, $last,
            $number,
            data = this.getData();

        if (this.options.sidePagination !== 'server') {
            this.options.totalRows = data.length;
        }

        this.totalPages = 0;
        if (this.options.totalRows) {
            this.totalPages = ~~((this.options.totalRows - 1) / this.options.pageSize) + 1;
            this.options.totalPages = this.totalPages;
        }
        if (this.totalPages > 0 && this.options.pageNumber > this.totalPages) {
            this.options.pageNumber = this.totalPages;
        }

        this.pageFrom = (this.options.pageNumber - 1) * this.options.pageSize + 1;
        this.pageTo = this.options.pageNumber * this.options.pageSize;
        if (this.pageTo > this.options.totalRows) {
            this.pageTo = this.options.totalRows;
        }

        html.push(
            '<div class="pull-left pagination-detail">',
                '<span class="pagination-info">',
                    this.options.formatShowingRows(this.pageFrom, this.pageTo, this.options.totalRows),
                '</span>');

        html.push('<span class="page-list">');

        var pageNumber = [
            '<span class="btn-group dropup">',
            '<button type="button" class="btn btn-default '+ (this.options.iconSize == undefined ? '' :  ' btn-' + this.options.iconSize)+ ' dropdown-toggle" data-toggle="dropdown">',
            '<span class="page-size">',
            this.options.pageSize,
            '</span>',
            ' <span class="caret"></span>',
            '</button>',
            '<ul class="dropdown-menu" role="menu">'],
            pageList = this.options.pageList;

        if (typeof this.options.pageList === 'string') {
            var list = this.options.pageList.replace('[', '').replace(']', '').replace(/ /g, '').split(',');

            pageList = [];
            $.each(list, function (i, value) {
                pageList.push(+value);
            });
        }

        $.each(pageList, function (i, page) {
            if (!that.options.smartDisplay || i === 0 || pageList[i-1] <= that.options.totalRows) {
                var active = page === that.options.pageSize ? ' class="active"' : '';
                pageNumber.push(sprintf('<li%s><a href="javascript:void(0)">%s</a></li>', active, page));
            }
        });
        pageNumber.push('</ul></span>');

        html.push(this.options.formatRecordsPerPage(pageNumber.join('')));
        html.push('</span>');

        html.push('</div>',
            '<div class="pull-right pagination">',
                '<ul class="pagination' + (this.options.iconSize == undefined ? '' :  ' pagination-' + this.options.iconSize)  + '">',
                    '<li class="page-first"><a href="javascript:void(0)">&lt;&lt;</a></li>',
                    '<li class="page-pre"><a href="javascript:void(0)">&lt;</a></li>');

        if (this.totalPages < 5) {
            from = 1;
            to = this.totalPages;
        } else {
            from = this.options.pageNumber - 2;
            to = from + 4;
            if (from < 1) {
                from = 1;
                to = 5;
            }
            if (to > this.totalPages) {
                to = this.totalPages;
                from = to - 4;
            }
        }
        for (i = from; i <= to; i++) {
            html.push('<li class="page-number' + (i === this.options.pageNumber ? ' active disabled' : '') + '">',
                '<a href="javascript:void(0)">', i ,'</a>',
                '</li>');
        }

        html.push(
                    '<li class="page-next"><a href="javascript:void(0)">&gt;</a></li>',
                    '<li class="page-last"><a href="javascript:void(0)">&gt;&gt;</a></li>',
                '</ul>',
            '</div>');

        this.$pagination.html(html.join(''));

        $pageList = this.$pagination.find('.page-list a');
        $first = this.$pagination.find('.page-first');
        $pre = this.$pagination.find('.page-pre');
        $next = this.$pagination.find('.page-next');
        $last = this.$pagination.find('.page-last');
        $number = this.$pagination.find('.page-number');

        if (this.options.pageNumber <= 1) {
            $first.addClass('disabled');
            $pre.addClass('disabled');
        }
        if (this.options.pageNumber >= this.totalPages) {
            $next.addClass('disabled');
            $last.addClass('disabled');
        }
        if (this.options.smartDisplay) {
            if (this.totalPages <= 1) {
                this.$pagination.find('div.pagination').hide();
            }
            if (this.options.pageList.length < 2 || this.options.totalRows <= this.options.pageList[0]) {
                this.$pagination.find('span.page-list').hide();
            }

            // when data is empty, hide the pagination
            this.$pagination[this.getData().length ? 'show' : 'hide']();
        }
        $pageList.off('click').on('click', $.proxy(this.onPageListChange, this));
        $first.off('click').on('click', $.proxy(this.onPageFirst, this));
        $pre.off('click').on('click', $.proxy(this.onPagePre, this));
        $next.off('click').on('click', $.proxy(this.onPageNext, this));
        $last.off('click').on('click', $.proxy(this.onPageLast, this));
        $number.off('click').on('click', $.proxy(this.onPageNumber, this));
    };

    BootstrapTable.prototype.updatePagination = function (event) {
        // Fix #171: IE disabled button can be clicked bug.
        if (event && $(event.currentTarget).hasClass('disabled')) {
            return;
        }

        if (!this.options.maintainSelected) {
            this.resetRows();
        }

        this.initPagination();
        if (this.options.sidePagination === 'server') {
            this.initServer();
        } else {
            this.initBody();
        }

        this.trigger('page-change', this.options.pageNumber, this.options.pageSize);
    };

    BootstrapTable.prototype.onPageListChange = function (event) {
        var $this = $(event.currentTarget);

        $this.parent().addClass('active').siblings().removeClass('active');
        this.options.pageSize = +$this.text();
        this.$toolbar.find('.page-size').text(this.options.pageSize);
        this.updatePagination(event);
    };

    BootstrapTable.prototype.onPageFirst = function (event) {
        this.options.pageNumber = 1;
        this.updatePagination(event);
    };

    BootstrapTable.prototype.onPagePre = function (event) {
        this.options.pageNumber--;
        this.updatePagination(event);
    };

    BootstrapTable.prototype.onPageNext = function (event) {
        this.options.pageNumber++;
        this.updatePagination(event);
    };

    BootstrapTable.prototype.onPageLast = function (event) {
        this.options.pageNumber = this.totalPages;
        this.updatePagination(event);
    };

    BootstrapTable.prototype.onPageNumber = function (event) {
        if (this.options.pageNumber === +$(event.currentTarget).text()) {
            return;
        }
        this.options.pageNumber = +$(event.currentTarget).text();
        this.updatePagination(event);
    };

    BootstrapTable.prototype.initBody = function (fixedScroll) {
        var that = this,
            html = [],
            data = this.getData();

        this.trigger('pre-body', data);

        this.$body = this.$el.find('tbody');
        if (!this.$body.length) {
            this.$body = $('<tbody></tbody>').appendTo(this.$el);
        }

        //Fix #389 Bootstrap-table-flatJSON is not working

        if (!this.options.pagination || this.options.sidePagination === 'server') {
            this.pageFrom = 1;
            this.pageTo = data.length;
        }

        for (var i = this.pageFrom - 1; i < this.pageTo; i++) {
            var item = data[i],
                style = {},
                csses = [],
                attributes = {},
                htmlAttributes = [];

            style = calculateObjectValue(this.options, this.options.rowStyle, [item, i], style);

            if (style && style.css) {
                for (var key in style.css) {
                    csses.push(key + ': ' + style.css[key]);
                }
            }

            attributes = calculateObjectValue(this.options,
                this.options.rowAttributes, [item, i], attributes);

            if (attributes) {
                for (var key in attributes) {
                    htmlAttributes.push(sprintf('%s="%s"', key, escapeHTML(attributes[key])));
                }
            }

            html.push('<tr',
                sprintf(' %s', htmlAttributes.join(' ')),
                sprintf(' id="%s"', $.isArray(item) ? undefined : item._id),
                sprintf(' class="%s"', style.classes || ($.isArray(item) ? undefined : item._class)),
                sprintf(' data-index="%s"', i),
                '>'
            );

            if (this.options.cardView) {
                html.push(sprintf('<td colspan="%s">', this.header.fields.length));
            }

            $.each(this.header.fields, function (j, field) {
                var text = '',
                    value = item[field],
                    type = '',
                    cellStyle = {},
                    id_ = '',
                    class_ = that.header.classes[j],
                    column = that.options.columns[getFieldIndex(that.options.columns, field)];

                style = sprintf('style="%s"', csses.concat(that.header.styles[j]).join('; '));

                value = calculateObjectValue(that.header,
                    that.header.formatters[j], [value, item, i], value);

                // handle td's id and class
                if (item['_' + field + '_id']) {
                    id_ = sprintf(' id="%s"', item['_' + field + '_id']);
                }
                if (item['_' + field + '_class']) {
                    class_ = sprintf(' class="%s"', item['_' + field + '_class']);
                }

                cellStyle = calculateObjectValue(that.header,
                    that.header.cellStyles[j], [value, item, i], cellStyle);
                if (cellStyle.classes) {
                    class_ = sprintf(' class="%s"', cellStyle.classes);
                }
                if (cellStyle.css) {
                    var csses_ = [];
                    for (var key in cellStyle.css) {
                        csses_.push(key + ': ' + cellStyle.css[key]);
                    }
                    style = sprintf('style="%s"', csses_.concat(that.header.styles[j]).join('; '));
                }

                if (column.checkbox || column.radio) {
                    //if card view mode bypass
                    if (that.options.cardView) {
                        return true;
                    }

                    type = column.checkbox ? 'checkbox' : type;
                    type = column.radio ? 'radio' : type;

                    text = ['<td class="bs-checkbox">',
                        '<input' +
                            sprintf(' data-index="%s"', i) +
                            sprintf(' name="%s"', that.options.selectItemName) +
                            sprintf(' type="%s"', type) +
                            sprintf(' value="%s"', item[that.options.idField]) +
                            sprintf(' checked="%s"', value === true ||
                                (value && value.checked) ? 'checked' : undefined) +
                            sprintf(' disabled="%s"', !column.checkboxEnabled ||
                                (value && value.disabled) ? 'disabled' : undefined) +
                            ' />',
                        '</td>'].join('');
                } else {
                    value = typeof value === 'undefined' || value === null ?
                        that.options.undefinedText : value;

                    text = that.options.cardView ?
                        ['<div class="card-view">',
                            that.options.showHeader ? sprintf('<span class="title" %s>%s</span>', style,
                                getPropertyFromOther(that.options.columns, 'field', 'title', field)) : '',
                            sprintf('<span class="value">%s</span>', value),
                            '</div>'].join('') :
                        [sprintf('<td%s %s %s>', id_, class_, style),
                            value,
                            '</td>'].join('');

                    // Hide empty data on Card view when smartDisplay is set to true.
                    if (that.options.cardView && that.options.smartDisplay && value === '') {
                        text = '';
                    }
                }

                html.push(text);
            });

            if (this.options.cardView) {
                html.push('</td>');
            }

            html.push('</tr>');
        }

        // show no records
        if (!html.length) {
            html.push('<tr class="no-records-found">',
                sprintf('<td colspan="%s">%s</td>', this.header.fields.length, this.options.formatNoMatches()),
                '</tr>');
        }

        this.$body.html(html.join(''));

        if (!fixedScroll) {
            this.scrollTo(0);
        }

        // click to select by column
        this.$body.find('> tr > td').off('click').on('click', function () {
            var $tr = $(this).parent();
            that.trigger('click-row', that.data[$tr.data('index')], $tr);
            // if click to select - then trigger the checkbox/radio click
            if (that.options.clickToSelect) {
                if (that.header.clickToSelects[$tr.children().index($(this))]) {
                    $tr.find(sprintf('[name="%s"]',
                        that.options.selectItemName))[0].click(); // #144: .trigger('click') bug
                }
            }
        });
        this.$body.find('tr').off('dblclick').on('dblclick', function () {
            that.trigger('dbl-click-row', that.data[$(this).data('index')], $(this));
        });

        this.$selectItem = this.$body.find(sprintf('[name="%s"]', this.options.selectItemName));
        this.$selectItem.off('click').on('click', function (event) {
            event.stopImmediatePropagation();

            var checked = $(this).prop('checked'),
                row = that.data[$(this).data('index')];

            row[that.header.stateField] = checked;
            that.trigger(checked ? 'check' : 'uncheck', row);

            if (that.options.singleSelect) {
                that.$selectItem.not(this).each(function () {
                    that.data[$(this).data('index')][that.header.stateField] = false;
                });
                that.$selectItem.filter(':checked').not(this).prop('checked', false);
            }

            that.updateSelected();
        });

        $.each(this.header.events, function (i, events) {
            if (!events) {
                return;
            }
            // fix bug, if events is defined with namespace
            if (typeof events === 'string') {
                events = calculateObjectValue(null, events);
            }
            for (var key in events) {
                that.$body.find('tr').each(function () {
                    var $tr = $(this),
                        $td = $tr.find(that.options.cardView ? '.card-view' : 'td').eq(i),
                        index = key.indexOf(' '),
                        name = key.substring(0, index),
                        el = key.substring(index + 1),
                        func = events[key];

                    $td.find(el).off(name).on(name, function (e) {
                        var index = $tr.data('index'),
                            row = that.data[index],
                            value = row[that.header.fields[i]];

                        func.apply(this, [e, value, row, index]);
                    });
                });
            }
        });

        this.updateSelected();
        this.resetView();

        this.trigger('post-body');
    };

    BootstrapTable.prototype.initServer = function (silent, query) {
        var that = this,
            data = {},
            params = {
                pageSize: this.options.pageSize,
                pageNumber: this.options.pageNumber,
                searchText: this.searchText,
                sortName: this.options.sortName,
                sortOrder: this.options.sortOrder
            };

        if (!this.options.url) {
            return;
        }

        if (this.options.queryParamsType === 'limit') {
            params = {
                search: params.searchText,
                sort: params.sortName,
                order: params.sortOrder
            };
            if (this.options.pagination) {
                params.limit = this.options.pageSize;
                params.offset = this.options.pageSize * (this.options.pageNumber - 1);
            }
        }
        data = calculateObjectValue(this.options, this.options.queryParams, [params], data);

        $.extend(data, query || {});

        // false to stop request
        if (data === false) {
            return;
        }

        if (!silent) {
            this.$loading.show();
        }

        $.ajax($.extend({}, calculateObjectValue(null, this.options.ajaxOptions), {
            type: this.options.method,
            url: this.options.url,
            data: this.options.contentType === 'application/json' && this.options.method === 'post' ?
                JSON.stringify(data): data,
            cache: this.options.cache,
            contentType: this.options.contentType,
            dataType: this.options.dataType,
            success: function (res) {
                res = calculateObjectValue(that.options, that.options.responseHandler, [res], res);

                that.load(res);
                that.trigger('load-success', res);
            },
            error: function (res) {
                that.trigger('load-error', res.status);
            },
            complete: function () {
                if (!silent) {
                    that.$loading.hide();
                }
            }
        }));
    };

    BootstrapTable.prototype.getCaretHtml = function () {
        return ['<span class="order' + (this.options.sortOrder === 'desc' ? '' : ' dropup') + '">',
                '<span class="caret" style="margin: 10px 5px;"></span>',
            '</span>'].join('');
    };

    BootstrapTable.prototype.updateSelected = function () {
        var checkAll = this.$selectItem.filter(':enabled').length ===
            this.$selectItem.filter(':enabled').filter(':checked').length;

        this.$selectAll.add(this.$selectAll_).prop('checked', checkAll);

        this.$selectItem.each(function () {
            $(this).parents('tr')[$(this).prop('checked') ? 'addClass' : 'removeClass']('selected');
        });
    };

    BootstrapTable.prototype.updateRows = function (checked) {
        var that = this;

        this.$selectItem.each(function () {
            that.data[$(this).data('index')][that.header.stateField] = checked;
        });
    };

    BootstrapTable.prototype.resetRows = function () {
        var that = this;

        $.each(this.data, function (i, row) {
            that.$selectAll.prop('checked', false);
            that.$selectItem.prop('checked', false);
            row[that.header.stateField] = false;
        });
    };

    BootstrapTable.prototype.trigger = function (name) {
        var args = Array.prototype.slice.call(arguments, 1);

        name += '.bs.table';
        this.options[BootstrapTable.EVENTS[name]].apply(this.options, args);
        this.$el.trigger($.Event(name), args);

        this.options.onAll(name, args);
        this.$el.trigger($.Event('all.bs.table'), [name, args]);
    };

    BootstrapTable.prototype.resetHeader = function () {
        var that = this,
            $fixedHeader = this.$container.find('.fixed-table-header'),
            $fixedBody = this.$container.find('.fixed-table-body'),
            scrollWidth = this.$el.width() > $fixedBody.width() ? getScrollBarWidth() : 0;

        // fix #61: the hidden table reset header bug.
        if (this.$el.is(':hidden')) {
            clearTimeout(this.timeoutId_); // doesn't matter if it's 0
            this.timeoutId_ = setTimeout($.proxy(this.resetHeader, this), 100); // 100ms
            return;
        }

        this.$header_ = this.$header.clone(true, true);
        this.$selectAll_ = this.$header_.find('[name="btSelectAll"]');

        // fix bug: get $el.css('width') error sometime (height = 500)
        setTimeout(function () {
            $fixedHeader.css({
                'height': '37px',
                'border-bottom': '1px solid #dddddd',
                'margin-right': scrollWidth
            }).find('table').css('width', that.$el.css('width'))
                .html('').attr('class', that.$el.attr('class'))
                .append(that.$header_);

            // fix bug: $.data() is not working as expected after $.append()
            that.$header.find('th').each(function (i) {
                that.$header_.find('th').eq(i).data($(this).data());
            });

            that.$body.find('tr:first-child:not(.no-records-found) > *').each(function(i) {
                that.$header_.find('div.fht-cell').eq(i).width($(this).innerWidth());
            });

            that.$el.css('margin-top', -that.$header.height());

            // horizontal scroll event
            $fixedBody.off('scroll').on('scroll', function () {
                $fixedHeader.scrollLeft($(this).scrollLeft());
            });
        });
    };

    BootstrapTable.prototype.toggleColumn = function (index, checked, needUpdate) {
        if (index === -1) {
            return;
        }
        this.options.columns[index].visible = checked;
        this.initHeader();
        this.initSearch();
        this.initPagination();
        this.initBody();

        if (this.options.showColumns) {
            var $items = this.$toolbar.find('.keep-open input').prop('disabled', false);

            if (needUpdate) {
                $items.filter(sprintf('[value="%s"]', index)).prop('checked', checked);
            }

            if ($items.filter(':checked').length <= this.options.minimumCountColumns) {
                $items.filter(':checked').prop('disabled', true);
            }
        }
    };

    // PUBLIC FUNCTION DEFINITION
    // =======================

    BootstrapTable.prototype.resetView = function (params) {
        var that = this,
            header = this.header;

        if (params && params.height) {
            this.options.height = params.height;
        }

        this.$selectAll.prop('checked', this.$selectItem.length > 0 &&
            this.$selectItem.length === this.$selectItem.filter(':checked').length);

        if (this.options.height) {
            var toolbarHeight = +this.$toolbar.children().outerHeight(true),
                paginationHeight = +this.$pagination.children().outerHeight(true),
                height = this.options.height - toolbarHeight - paginationHeight;

            this.$container.find('.fixed-table-container').css('height', height + 'px');
        }

        if (this.options.cardView) {
            // remove the element css
            that.$el.css('margin-top', '0');
            that.$container.find('.fixed-table-container').css('padding-bottom', '0');
            return;
        }

        if (this.options.showHeader && this.options.height) {
            this.resetHeader();
        }

        if (this.options.height && this.options.showHeader) {
            this.$container.find('.fixed-table-container').css('padding-bottom', '37px');
        }
    };

    BootstrapTable.prototype.getData = function () {
        return (this.searchText || !$.isEmptyObject(this.filterColumns)) ? this.data : this.options.data;
    };

    BootstrapTable.prototype.load = function (data) {
        // #431: support pagination
        if (this.options.sidePagination === 'server') {
            this.options.totalRows = data.total;
            data = data.rows;
        }

        this.initData(data);
        this.initSearch();
        this.initPagination();
        this.initBody();
    };

    BootstrapTable.prototype.append = function (data) {
        this.initData(data, 'append');
        this.initSearch();
        this.initPagination();
        this.initBody(true);
    };

    BootstrapTable.prototype.prepend = function (data) {
        this.initData(data, 'prepend');
        this.initSearch();
        this.initPagination();
        this.initBody(true);
    };

    BootstrapTable.prototype.remove = function (params) {
        var len = this.options.data.length,
            i, row;

        if (!params.hasOwnProperty('field') || !params.hasOwnProperty('values')) {
            return;
        }

        for (i = len - 1; i >= 0; i--) {
            row = this.options.data[i];

            if (!row.hasOwnProperty(params.field)) {
                return;
            }
            if ($.inArray(row[params.field], params.values) !== -1) {
                this.options.data.splice(i, 1);
            }
        }

        if (len === this.options.data.length) {
            return;
        }

        this.initSearch();
        this.initPagination();
        this.initBody(true);
    };

    BootstrapTable.prototype.update = function (params) {
        var len = this.data.length,
            i, row;

        if (!params.hasOwnProperty('field') || !params.hasOwnProperty('data')) {
            return;
        }

        for (i = len - 1; i >= 0; i--) {
            row = this.data[i];

            if (!row.hasOwnProperty(params.field)) {
                return;
            }
            if (row[params.field] === params.data[params.field]) {
                $.extend(this.data[i], params.data);
                break;
            }
        }

        this.initBody(true);
    };

    BootstrapTable.prototype.insertRow = function (params) {
        if (!params.hasOwnProperty('index') || !params.hasOwnProperty('row')) {
            return;
        }
        this.data.splice(params.index, 0, params.row);
        this.initBody(true);
    };

    BootstrapTable.prototype.updateRow = function (params) {
        if (!params.hasOwnProperty('index') || !params.hasOwnProperty('row')) {
            return;
        }
        $.extend(this.data[params.index], params.row);
        this.initBody(true);
    };

    BootstrapTable.prototype.mergeCells = function (options) {
        var row = options.index,
            col = $.inArray(options.field, this.header.fields),
            rowspan = options.rowspan || 1,
            colspan = options.colspan || 1,
            i, j,
            $tr = this.$body.find('tr'),
            $td = $tr.eq(row).find('td').eq(col);

        if (row < 0 || col < 0 || row >= this.data.length) {
            return;
        }

        for (i = row; i < row + rowspan; i++) {
            for (j = col; j < col + colspan; j++) {
                $tr.eq(i).find('td').eq(j).hide();
            }
        }

        $td.attr('rowspan', rowspan).attr('colspan', colspan).show();
    };

    BootstrapTable.prototype.getOptions = function () {
        return this.options;
    };

    BootstrapTable.prototype.getSelections = function () {
        var that = this;

        return $.grep(this.data, function (row) {
            return row[that.header.stateField];
        });
    };

    BootstrapTable.prototype.checkAll = function () {
        this.checkAll_(true);
    };

    BootstrapTable.prototype.uncheckAll = function () {
        this.checkAll_(false);
    };

    BootstrapTable.prototype.checkAll_ = function (checked) {
        this.$selectItem.filter(':enabled').prop('checked', checked);
        this.updateRows(checked);
        this.updateSelected();
        this.trigger(checked ? 'check-all' : 'uncheck-all');
    };

    BootstrapTable.prototype.check = function (index) {
        this.check_(true, index);
    };

    BootstrapTable.prototype.uncheck = function (index) {
        this.check_(false, index);
    };

    BootstrapTable.prototype.check_ = function (checked, index) {
        this.$selectItem.filter(sprintf('[data-index="%s"]', index)).prop('checked', checked);
        this.data[index][this.header.stateField] = checked;
        this.updateSelected();
    };

    BootstrapTable.prototype.destroy = function () {
        this.$el.insertBefore(this.$container);
        $(this.options.toolbar).insertBefore(this.$el);
        this.$container.next().remove();
        this.$container.remove();
        this.$el.html(this.$el_.html())
            .css('margin-top', '0')
            .attr('class', this.$el_.attr('class') || ''); // reset the class
    };

    BootstrapTable.prototype.showLoading = function () {
        this.$loading.show();
    };

    BootstrapTable.prototype.hideLoading = function () {
        this.$loading.hide();
    };

    BootstrapTable.prototype.togglePagination = function () {
        this.options.pagination = !this.options.pagination;
        var button = this.$toolbar.find('button[name="paginationSwitch"] i');
        if (this.options.pagination) {
            button.attr("class", this.options.iconsPrefix + " " + this.options.icons.paginationSwitchDown);
        } else {
            button.attr("class", this.options.iconsPrefix + " " + this.options.icons.paginationSwitchUp);
        }
        this.updatePagination();
    };

    BootstrapTable.prototype.refresh = function (params) {
        if (params && params.url) {
            this.options.url = params.url;
            this.options.pageNumber = 1;
        }
        this.initServer(params && params.silent, params && params.query);
    };

    BootstrapTable.prototype.showColumn = function (field) {
        this.toggleColumn(getFieldIndex(this.options.columns, field), true, true);
    };

    BootstrapTable.prototype.hideColumn = function (field) {
        this.toggleColumn(getFieldIndex(this.options.columns, field), false, true);
    };

    BootstrapTable.prototype.filterBy = function (columns) {
        this.filterColumns = $.isEmptyObject(columns) ? {}: columns;
        this.options.pageNumber = 1;
        this.initSearch();
        this.updatePagination();
    };

    BootstrapTable.prototype.scrollTo = function (value) {
        var $tbody = this.$container.find('.fixed-table-body');
        if (typeof value === 'string') {
            value = value === 'bottom' ? $tbody[0].scrollHeight : 0;
        }
        if (typeof value === 'number') {
            $tbody.scrollTop(value);
        }
    };

    BootstrapTable.prototype.selectPage = function (page) {
        if (page > 0 && page <= this.options.totalPages) {
            this.options.pageNumber = page;
            this.updatePagination();
        }
    };

    BootstrapTable.prototype.prevPage = function () {
        if (this.options.pageNumber > 1) {
            this.options.pageNumber--;
            this.updatePagination();
        }
    };

    BootstrapTable.prototype.nextPage = function () {
        if (this.options.pageNumber < this.options.totalPages) {
            this.options.pageNumber++;
            this.updatePagination();
        }
    };

    BootstrapTable.prototype.toggleView = function () {
        this.options.cardView = !this.options.cardView;
        this.initHeader();
        this.initBody();
    };

    // BOOTSTRAP TABLE PLUGIN DEFINITION
    // =======================

    var allowedMethods = [
        'getOptions',
        'getSelections', 'getData',
        'load', 'append', 'prepend', 'remove',
        'insertRow', 'updateRow',
        'mergeCells',
        'checkAll', 'uncheckAll',
        'check', 'uncheck',
        'refresh',
        'resetView',
        'destroy',
        'showLoading', 'hideLoading',
        'showColumn', 'hideColumn',
        'filterBy',
        'scrollTo',
        'selectPage', 'prevPage', 'nextPage',
        'togglePagination',
        'toggleView',
        'update'
    ];

    $.fn.bootstrapTable = function (option, _relatedTarget) {
        var value;

        this.each(function () {
            var $this = $(this),
                data = $this.data('bootstrap.table'),
                options = $.extend({}, BootstrapTable.DEFAULTS, $this.data(),
                    typeof option === 'object' && option);

            if (typeof option === 'string') {
                if ($.inArray(option, allowedMethods) < 0) {
                    throw "Unknown method: " + option;
                }

                if (!data) {
                    return;
                }

                value = data[option](_relatedTarget);

                if (option === 'destroy') {
                    $this.removeData('bootstrap.table');
                }
            }

            if (!data) {
                $this.data('bootstrap.table', (data = new BootstrapTable(this, options)));
            }
        });

        return typeof value === 'undefined' ? this : value;
    };

    $.fn.bootstrapTable.Constructor = BootstrapTable;
    $.fn.bootstrapTable.defaults = BootstrapTable.DEFAULTS;
    $.fn.bootstrapTable.columnDefaults = BootstrapTable.COLUMN_DEFAULTS;
    $.fn.bootstrapTable.locales = BootstrapTable.LOCALES;
    $.fn.bootstrapTable.methods = allowedMethods;

    // BOOTSTRAP TABLE INIT
    // =======================

    $(function () {
        $('[data-toggle="table"]').bootstrapTable();
    });

}(jQuery);

/**
 * @author zhixin wen <wenzhixin2010@gmail.com>
 * extensions: https://github.com/vitalets/x-editable
 */

!function($) {

    'use strict';

    $.extend($.fn.bootstrapTable.defaults, {
        editable: true,
        onEditableInit: function () {return false;}
    });

    $.extend($.fn.bootstrapTable.Constructor.EVENTS, {
        'editable-init.bs.table': 'onEditableInit'
    });

    var BootstrapTable = $.fn.bootstrapTable.Constructor,
        _initTable = BootstrapTable.prototype.initTable,
        _initBody = BootstrapTable.prototype.initBody;

    BootstrapTable.prototype.initTable = function () {
        var that = this;
        _initTable.apply(this, Array.prototype.slice.apply(arguments));

        if (!this.options.editable) {
            return;
        }

        $.each(this.options.columns, function (i, column) {
            if (!column.editable) {
                return;
            }

            var _formatter = column.formatter;
            column.formatter = function (value, row, index) {
                var result = _formatter ? _formatter(value, row, index) : value;

                return ['<a href="javascript:void(0)"',
                    ' data-name="' + column.field + '"',
                    ' data-pk="' + row[that.options.idField] + '"',
                    '>' + result + '</a>'
                ].join('');
            };
        });
    };

    BootstrapTable.prototype.initBody = function () {
        var that = this;
        _initBody.apply(this, Array.prototype.slice.apply(arguments));

        if (!this.options.editable) {
            return;
        }

        $.each(this.options.columns, function (i, column) {
            if (!column.editable) {
                return;
            }

            var data = that.getData();

            that.$body.find('a[data-name="' + column.field + '"]')
                .each(function() {
                    if(typeof(column.editable) == 'function') {
                        var row = data[$(this).parents('tr[data-index]').data('index')];
                        $(this).editable(column.editable(row, column.field));
                    }
                    else {
                        $(this).editable(column.editable)
                    }
                })
                .off('save').on('save', function (e, params) {
                    var row = data[$(this).parents('tr[data-index]').data('index')];

                    if (that.options.dataSetter)
                        that.options.dataSetter(row, column.field, params.newValue);
                    else
                        row[column.field] = params.newValue;
                });
        });
        this.trigger('editable-init');
    };

}(jQuery);

(function ($) {
  var defaults = {
    type: null,
    showLangSelect: true,
    selectize: false,
    create: true
  };

  var intVerify = function(v, includeZero, includeNeg, includePos, maxi, mini) {
    var i = parseInt(v, 10);
    if(isNaN(i))
      return false;
    if(!includeZero && i == 0)
      return false;
    if(!includeNeg && i < 0)
      return false;
    if(!includePos && i > 0)
      return false;
    if(maxi != undefined && i > maxi)
      return false;
    if(mini != undefined && i < mini)
      return false;
    return true;
  };

  var decimalCheck = function(v) {
    return $.isNumeric(v);
  };

  var nodeTypes = {
    'http://www.w3.org/2000/01/rdf-schema#Literal': {
      label: 'Plain Literal'
    },
    'http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource': {
      label: 'Reference'
    },
    "http://www.w3.org/2001/XMLSchema#integer": {
      label: 'Integer',
      verify: function(v) {
        return intVerify(v, true, true, true);
      }
    },
    "http://www.w3.org/2001/XMLSchema#decimal": {
      label: 'Decimal',
      verify: decimalCheck
    },
    "http://www.w3.org/2001/XMLSchema#double": {
      label: 'Double',
      verify: decimalCheck
    },
    "http://www.w3.org/2001/XMLSchema#float": {
      label: 'Float',
      verify: decimalCheck
    },
    "http://www.w3.org/2001/XMLSchema#nonPositiveInteger": {
      label: 'Non-Positive Integer',
      verify: function(v) {
        return intVerify(v, true, true, false);
      }
    },
    "http://www.w3.org/2001/XMLSchema#negativeInteger": {
      label: 'Negative Integer',
      verify: function(v) {
        return intVerify(v, false, true, false);
      }
    },
    "http://www.w3.org/2001/XMLSchema#long": {
      label: 'Long',
      verify: function(v) {
        return intVerify(v, true, true, true);
      }
    },
    "http://www.w3.org/2001/XMLSchema#int": {
      label: 'Int',
      verify: function(v) {
        return intVerify(v, true, true, true, 2147483647, -2147483648);
      }
    },
    "http://www.w3.org/2001/XMLSchema#short": {
      label: 'Short',
      verify: function(v) {
        return intVerify(v, true, true, true, 32767, -32768);
      }
    },
    "http://www.w3.org/2001/XMLSchema#byte": {
      label: 'Byte',
      verify: function(v) {
        return intVerify(v, true, true, true, 127, -128);
      }
    },
    "http://www.w3.org/2001/XMLSchema#nonNegativeInteger": {
      label: 'Non-Negative Integer',
      verify: function(v) {
        return intVerify(v, true, false, true);
      }
    },
    "http://www.w3.org/2001/XMLSchema#unsignedLong": {
      label: 'Unsigned Long',
      verify: function(v) {
        return intVerify(v, true, false, true);
      }
    },
    "http://www.w3.org/2001/XMLSchema#unsignedInt": {
      label: 'Unsigned Int',
      verify: function(v) {
        return intVerify(v, true, false, true, 4294967295);
      }
    },
    "http://www.w3.org/2001/XMLSchema#unsignedShort": {
      label: 'Unsigned Short',
      verify: function(v) {
        return intVerify(v, true, false, true, 65535);
      }
    },
    "http://www.w3.org/2001/XMLSchema#unsignedByte": {
      label: 'Unsigned Byte',
      verify: function(v) {
        return intVerify(v, true, true, true, 255);
      }
    },
    "http://www.w3.org/2001/XMLSchema#positiveInteger": {
      label: 'Positive Integer',
      verify: function(v) {
        return intVerify(v, false, false, true);
      }
    },
    "http://www.w3.org/2001/XMLSchema#boolean": {
      label: 'Boolean',
      setup: function(elem, remove) {
        if(remove) {
          if(elem.bootstrapToggle)
            elem.bootstrapToggle('destroy');
          elem.attr('type', 'text');
        }
        else {
          if(elem.bootstrapToggle)
            elem.bootstrapToggle({
              on: 'True',
              off: 'False'
            });
          elem.attr('type', 'checkbox');
        }
      },
      getValue: function(elem) {
        return (elem.is(":checked") ? "true" : "false");
      },
      setValue: function(elem, val) {
        if(parseInt(val) == 1 || (typeof val == "string" && val.toLowerCase() == 'true'))
          elem.attr('checked', 'checked');
        else
          elem.removeAttr('checked');
      }
    },
    "http://www.w3.org/2001/XMLSchema#string": {
      label: 'String'
    },
    "http://www.w3.org/2001/XMLSchema#hexBinary": {
      label: 'Hex Binary'
    },
    "http://www.w3.org/2001/XMLSchema#dateTime": {
      label: 'Datetime',
      setup: function(input, remove) {
        if(remove)
          input.datetimepicker('remove');
        else
          input.datetimepicker({
            format: "yyyy-mm-ddThh:ii:ssZ",
            weekStart: 1
          });
      }
    },
    "http://www.w3.org/2001/XMLSchema#date": {
      label: 'Date',
      setup: function(input, remove) {
        if(remove)
          input.datetimepicker('remove');
        else
          input.datetimepicker({
            format: "yyyy-mm-dd",
            weekStart: 1
          });
      }
    }
  };

  var RdfNodeEditor = function(elem, options) {
    var self = this;

    self.mainElem = elem;
    self.options = $.extend({}, defaults, options);
    self.currentType = self.options.type || 'http://www.w3.org/2000/01/rdf-schema#Literal';

    self.mainElem.on('input', function() {
      self.verifyInput();
      self.change();
    });

    // put the input into a div for easier control
    self.container = $(document.createElement('div')).addClass('rdfNodeEditor');
    self.inputContainer = $(document.createElement('div')).addClass('rdfNodeInputContainer');
    var $e = $(elem).addClass('form-control');
    $e.after(self.container);
    self.inputContainer.append($e);
    self.container.append(self.inputContainer);

    // setup choices
    if(self.options.choices) {
      self.resSelect = $(document.createElement('select'));
      self.inputContainer.append(self.resSelect);
      self.mainElem.hide();
      var selectizeSetup = function(items) {
        var nodes = [];
        for(var i = 0; i < items.length; i++) {
          var n = RDFE.RdfNode.fromStoreNode(items[i])
          // a small hacky way of allowing labels for the choices.
          n.label = items[i].label || n.value;
          nodes.push(n);
        }
        self.resSelect.selectize({
          valueField: "value",
          searchField: "label",
          sortField: "label",
          options: nodes,
          create: (self.options.create ? function(input, cb) {
            var n = new RDFE.RdfNode('uri', input);
            n.label = input;
            this.options[input] = n;
            cb(n);
          } : false),
          createOnBlur: true,
          onChange: function(value) {
            self.mainElem.val(value);
            self.change();
          },
          render: {
            item: function(item, escape) {
              return '<div>' + escape(item.label || item.value) + '</div>';
            },
            option: function(item, escape) {
              if(item.label)
                return '<div>' + escape(item.label) + ' <small>(' + escape(item.value) + ')</small></div>';
              else
                return '<div>' + escape(item.value) + '</div>';
            }
          }
        });
      };
      if(typeof(self.options.choices) == 'object') {
        selectizeSetup(self.options.choices);
      }
      else if(typeof(self.options.choices) == 'function') {
        self.options.choices(function (items) {
          selectizeSetup(items);
        });
      }
    }

    // create language input
    self.langElem = $(document.createElement('input')).addClass('form-control').attr('placeholder', 'Language');
    self.langContainer = $(document.createElement('div')).addClass('rdfNodeLangContainer');
    self.langContainer.append(self.langElem);
    self.container.append(self.langContainer);
    if(self.currentType != 'http://www.w3.org/2000/01/rdf-schema#Literal')
      self.langContainer.hide();
    self.langElem.on('input', function() {
      self.lang = self.langElem.val();
      self.verifyInput();
      self.change();
    });
    if (!self.options.showLangSelect) {
      self.langContainer.hide();
    }

    // create type-selection
    self.typeContainer = $(document.createElement('div')).addClass('rdfNodeTypeContainer');
    self.typeElem = $(document.createElement('select')).addClass('form-control');
    for(t in nodeTypes) {
      self.typeElem.append($(document.createElement('option')).attr('value', t).text(nodeTypes[t].label));
    }
    self.typeContainer.append(self.typeElem);
    self.container.append(self.typeContainer);
    var typeChFct = function() {
      self.lastType = self.currentType;
      self.currentType = (self.options.selectize ? self.typeElem[0].selectize.getValue() : self.typeElem.val());
      self.verifyFct = nodeTypes[self.currentType].verify;
      self.updateEditor();
      self.verifyInput();
      self.change();
    };
    if(self.options.selectize) {
      self.typeElem.selectize({
        onChange: typeChFct
      });
      self.typeElem[0].selectize.setValue(this.currentType);
    }
    else {
      self.typeElem.change(typeChFct);
    }
    if(self.options.type) {
      self.typeElem.val(self.options.type);
      self.typeContainer.hide();
    }

    self.updateEditor(true);
  };

  RdfNodeEditor.prototype.change = function() {
    $(this).trigger('change', this);
  };

  /**
   * Check if two literal types are compatible. The only point of this function is to
   * allow the special case of xsd:string == rdfs:Literal.
   *
   * @return @p true if the given types are compatible, @p false otherwise.
   */
  var checkTypeComp = function() {
    var ta = [
      'http://www.w3.org/2000/01/rdf-schema#Literal',
      'http://www.w3.org/2001/XMLSchema#string'
    ];

    return function(t1, t2) {
      return (t1 === t2 || ($.inArray(t1, ta) >= 0 && $.inArray(t2, ta) >= 0));
    };
  }();

  RdfNodeEditor.prototype.updateEditor = function(initial) {
    // always show the type selection field if the type differs
    // typed string and plain literal without lang should be treated as similar
    if(checkTypeComp(this.options.type, this.currentType)) {
      this.typeContainer.hide();
    }
    else {
      this.typeContainer.css('display', 'table-cell');
    }

    if(!this.options.showLangSelect || this.currentType != 'http://www.w3.org/2000/01/rdf-schema#Literal')
      this.langContainer.hide();
    else
      this.langContainer.css('display', 'table-cell');

    if(initial || this.lastType != this.currentType) {
      if(this.lastType && nodeTypes[this.lastType].setup)
        nodeTypes[this.lastType].setup(this.mainElem, true);
      if(nodeTypes[this.currentType].setup)
        nodeTypes[this.currentType].setup(this.mainElem);
    }
  };

  RdfNodeEditor.prototype.getValue = function() {
    if(this.currentType == 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource')
      return new RDFE.RdfNode(
        'uri',
        this.mainElem.val()
      );
    else
      return new RDFE.RdfNode(
        'literal',
        (nodeTypes[this.currentType].getValue ? nodeTypes[this.currentType].getValue(this.mainElem) : this.mainElem.val()),
        (this.currentType != 'http://www.w3.org/2000/01/rdf-schema#Literal' ? this.currentType : undefined),
        (this.lang ? this.lang : undefined)
      );
  };

  RdfNodeEditor.prototype.setValue = function(node_) {
    //console.log('RdfNodeEditor.prototype.setValue ', node);
    if(node_) {
      var node = RDFE.RdfNode.fromStoreNode(node_);
      this.lastType = this.currentType;
      var t = node.type;
      if (t === 'uri') {
        this.currentType = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource';
      }
      else {
        this.currentType = node.datatype || 'http://www.w3.org/2000/01/rdf-schema#Literal';

        // special case for boolean where we support 0 and 1
        if(this.options.type === "http://www.w3.org/2001/XMLSchema#boolean" &&
           (node.value === "0" || node.value === "1")) {
          this.currentType = "http://www.w3.org/2001/XMLSchema#boolean";
        }
      }
      this.lang = node.language;

      if (node.value.indexOf('\n') !== -1) {
        this.transformToTextarea();
      }
      this.mainElem.val(node.value);
      if(this.resSelect) {
        this.resSelect[0].selectize.addOption(node);
        this.resSelect[0].selectize.setValue(node.value);
      }
      if(nodeTypes[this.currentType] && nodeTypes[this.currentType].setValue)
        nodeTypes[this.currentType].setValue(this.mainElem, this.mainElem.val());

      this.langElem.val(this.lang);
      this.typeElem.val(this.currentType);
      if(this.options.selectize)
        this.typeElem[0].selectize.setValue(this.currentType);

      this.updateEditor();
    }
  };

  RdfNodeEditor.prototype.isValid = function(node) {
    return(this.verifyFct ? this.verifyFct(this.mainElem.val()) : true);
  };

  RdfNodeEditor.prototype.verifyInput = function() {
    var self = this;
    var val = $(this.mainElem).val();
    var v = true;
    if(val.length > 0)
      v = (this.verifyFct ? this.verifyFct(val) : true);
    if (v)
      self.mainElem.removeClass('has-error');
    else
      self.mainElem.addClass('has-error');
  };

  RdfNodeEditor.prototype.isLiteralType = function(uri) {
    return nodeTypes.hasOwnProperty(uri) && uri != 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource';
  };

  RdfNodeEditor.prototype.setEditFocus = function() {
    this.mainElem.focus();
  };

  RdfNodeEditor.prototype.blur = function() {
    this.mainElem.blur();
  };

  RdfNodeEditor.prototype.getElement = function() {
    return this.container;
  };

  RdfNodeEditor.prototype.transformToTextarea = function() {
    var self = this;

    if ((self.mainElem.prop("tagName") === 'INPUT') && (self.mainElem.prop("type") === 'text')) {
      var content = self.mainElem.val()
          textArea = document.createElement('textarea');

      // Make sure all properties are transferred to the new object
      textArea.id    = self.mainElem.prop("id");
      textArea.name  = self.mainElem.prop("name");
      $(textArea).addClass(self.mainElem.prop("class"));

      textArea.value = content;

      // Make the switch!
      self.mainElem.replaceWith(textArea);
      self.mainElem = $(textArea);
    }
  };

  $.fn.rdfNodeEditor = function(methodOrOptions) {
    var le = this.data('rdfNodeEditor');
    if(!le) {
      le = new RdfNodeEditor(this, methodOrOptions);
      this.data('rdfNodeEditor', le);
    }
    return le;
  };
})(jQuery);

(function ($) {
    "use strict";

    var RdfNode = function (options) {
        this.init('rdfnode', options, RdfNode.defaults);
    };
    //inherit from abstract, as inheritance from text gives selection error.
    $.fn.editableutils.inherit(RdfNode, $.fn.editabletypes.abstractinput);
    $.extend(RdfNode.prototype, {
        render: function() {
          this.$input = this.$tpl.filter('input');
          this.setClass();
          this.$input.rdfNodeEditor(this.options.rdfnode);
        },
        activate: function() {
          this.$input.rdfNodeEditor().setEditFocus();
        },
        value2html: function(value, element) {
          if(!value) {
              $(element).empty();
              return;
          }
          $(element).text(value.toString());
        },
        html2value: function(html) {
          return null;
        },
        input2value: function() {
          return this.$input.rdfNodeEditor().getValue();
        },
        value2input: function(value) {
          this.$input.rdfNodeEditor().setValue(value);
        }
    });
    RdfNode.defaults = $.extend({}, $.fn.editabletypes.abstractinput.defaults, {
        rdfnode: {},
        tpl: '<input type="text">'
    });
    $.fn.editabletypes.rdfnode = RdfNode;
}(window.jQuery));

(function ($) {

  var OntoBox = function(elem, options) {
    var self = this;

    self.options = $.extend({}, options);
    self.options.ontoManager = self.options.ontoManager || new RDFE.OntologyManager();

    self.mainElem = elem;

    $(ontologyManager).on('changed', function(e, om) {
      self.sel.addOption(om.allOntologies());
    });

    $(self.mainElem).selectize({
      valueField: "URI",
      searchField: [ "title", "label", "prefix", "URI" ],
      sortField: [ "prefix", "URI" ],
      options: self.options.ontoManager.ontologies,
      onChange: function(value) {
        $(self).trigger('changed', self.options.ontoManager.ontologyByURI(value));
      },
      create: function(input, cb) {
        var url = self.options.ontoManager.ontologyDetermine(input);
        if (!url) {
          url = self.options.ontoManager.prefixes[input] || input;
        }
        self.options.ontoManager.ontologyParse(url, {
          "success": function(onto) {
            cb(onto);
          },
          "error": function() {
            cb(null);
          }
        });
      },
      render: {
        item: function(item, escape) {
          return '<div>' + escape(item.title || item.label || item.prefix || item.URI) + '</div>';
        },
        option: function(item, escape) {
          return '<div>' + escape(item.title || item.label || item.prefix || item.URI) + '<br/><small>(' + escape(item.URI) + ')</small></div>';
        },
        'option_create': function(data, escape) {
          var url = self.options.ontoManager.prefixes[data.input] || data.input;
          if (url != data.input)
            return '<div class="create">Load <strong>' + escape(data.input) + '</strong> <small>(' + escape(url) + ')</small>&hellip;</div>';
          else
            return '<div class="create">Load <strong>' + escape(url) + '</strong>&hellip;</div>';
        }
      }
    });

    self.sel = $(self.mainElem)[0].selectize;
  };

  OntoBox.prototype.selectedOntologyURI = function() {
    return this.sel.getValue();
  };

  OntoBox.prototype.selectedOntology = function() {
    return this.sel.options[this.selectedOntologyURI()];
  };

  OntoBox.prototype.on = function(e, cb) {
    $(this).on(e, cb);
  };

  $.fn.ontoBox = function(methodOrOptions) {
    var le = this.data('ontoBox');
    if(!le) {
      le = new OntoBox(this, methodOrOptions);
      this.data('ontoBox', le);
    }
    return le;
  };
})(jQuery);

(function ($) {

  var PropertyBox = function(elem, options) {
    var self = this;

    self.options = $.extend({}, PropertyBox.defaults, options);
    self.options.ontoManager = self.options.ontoManager || new RDFE.OntologyManager();

    self.mainElem = elem;

    $(ontologyManager).on('ontologyLoaded', function(e, om, onto) {
      self.updateOptions();
    });

    $(self.mainElem).selectize({
      valueField: "URI",
      searchField: [ "title", "label", "prefix", "URI" ],
      sortField: [ "prefix", "URI" ],
      options: self.propertyList(),
      onChange: function(value) {
        $(self).trigger('changed', self.sel.options[value]);
      },
      create: function(input, cb) {
        // search for and optionally create a new property
        cb(self.options.ontoManager.ontologyPropertyByURI(self.options.ontoManager.uriDenormalize(input), true));
      },
      render: {
        item: function(item, escape) {
          var x = item.title || item.label || name.curi || item.name;
          if(item.curi && item.curi != x) {
            x = escape(x) + ' <small>(' + escape(item.curi) + ')</small>';
          }
          else {
            x = escape(x);
          }
          return '<div>' + x + '</div>';
        },
        option: function(item, escape) {
          return '<div>' + escape(item.title || item.label || name.curi || item.name) + '<br/><small>(' + escape(item.URI) + ')</small></div>';
        },
        'option_create': function(data, escape) {
          var url = self.options.ontoManager.uriDenormalize(data.input);
          if (url != data.input)
            return '<div class="create">Add <strong>' + escape(data.input) + '</strong> <small>(' + escape(url) + ')</small>&hellip;</div>';
          else
            return '<div class="create">Add <strong>' + escape(url) + '</strong>&hellip;</div>';
        }
      }
    });

    self.sel = $(self.mainElem)[0].selectize;
  };

  PropertyBox.defaults = {
    'ontoManager': null,
    'ontology': null
  };

  PropertyBox.prototype.setOntology = function(onto) {
    console.log('setOntology', onto);
    this.options.ontology = onto;
    this.updateOptions();
  };

  PropertyBox.prototype.propertyList = function() {
    console.log('propertyList', this.options);
    if(this.options.ontology) {
      return this.options.ontology.allProperties();
    }
    else {
      return this.options.ontoManager.allProperties();
    }
  };

  PropertyBox.prototype.updateOptions = function() {
    var pl = this.propertyList();
    this.sel.clearOptions()
    this.sel.addOption(pl); // FIXME: check if we also need to add the current value
  };

  PropertyBox.prototype.setPropertyURI = function(uri) {
    console.log('PropertyBox.setPropertyURI', uri);
    if(uri) {
      var u = this.options.ontoManager.uriDenormalize(uri);
      if(!this.sel.options[u])
        this.sel.addOption(this.options.ontoManager.OntologyProperty(null, u));
      this.sel.setValue(u);
    }
    else {
      this.sel.setValue(null);
    }
  };

  PropertyBox.prototype.selectedURI = function() {
    return this.sel.getValue();
  };

  PropertyBox.prototype.selectedProperty = function() {
    return this.sel.options[this.selectedURI()];
  };

  PropertyBox.prototype.on = function(e, cb) {
    $(this).on(e, cb);
    return this;
  };

  $.fn.propertyBox = function(methodOrOptions) {
    var le = this.data('propertyBox');
    if(!le) {
      le = new PropertyBox(this, methodOrOptions);
      this.data('propertyBox', le);
    }
    return le;
  };
})(jQuery);

(function ($) {
    "use strict";

    var PropertyBoxEdit = function (options) {
        this.init('rdfnode', options, PropertyBoxEdit.defaults);
    };
    //inherit from abstract, as inheritance from text gives selection error.
    $.fn.editableutils.inherit(PropertyBoxEdit, $.fn.editabletypes.abstractinput);
    $.extend(PropertyBoxEdit.prototype, {
        render: function() {
          this.$input = this.$tpl.filter('select');
          this.setClass();
          this.$input.propertyBox(this.options.propertyBox);
          // FIXME: find a better way to make this larger than a fixed min-width
          this.$input.propertyBox().sel.$control.css('min-width', '250px');
        },
        activate: function() {
          // do nothing
        },
        value2html: function(value, element) {
          if(!value) {
              $(element).empty();
              return;
          }
          $(element).text(value.toString());
        },
        html2value: function(html) {
          return null;
        },
        input2value: function() {
          return this.$input.propertyBox().selectedURI();
        },
        value2input: function(value) {
          this.$input.propertyBox().setPropertyURI(value);
        }
    });
    PropertyBoxEdit.defaults = $.extend({}, $.fn.editabletypes.abstractinput.defaults, {
        propertyBox: {},
        tpl: '<select></select>'
    });
    $.fn.editabletypes.propertyBox = PropertyBoxEdit;
}(window.jQuery));

(function($) {
  if (!window.RDFE) {
    window.RDFE = {};
  }

  RDFE.TripleView = (function() {
    // constructor
    var c = function(doc, ontoMan) {
      this.doc = doc;
      this.ontologyManager = ontoMan;
    };

    var nodeFormatter = function(value) {
      if (value.interfaceName == "Literal") {
        if (value.datatype == 'http://www.w3.org/2001/XMLSchema#dateTime')
          return (new Date(value.nominalValue)).toString();
        else
          return value.nominalValue;
      } else {
        return value.toString();
      }
    };

    c.prototype.render = function(container, callback) {
      var self = this;

      var tripleEditorDataSetter = function(triple, field, newValue) {
        var newNode = newValue;

        if (field === 'predicate') {
          newNode = self.doc.store.rdf.createNamedNode(newValue);
        }
        if (newValue.toStoreNode) {
          newNode = newValue.toStoreNode(self.doc.store);
        }
        else if (field != 'object' ||
          triple.object.interfaceName == 'NamedNode') {
          newNode = self.doc.store.rdf.createNamedNode(newValue);
        }
        else if (triple.object.datatype == 'http://www.w3.org/2001/XMLSchema#dateTime') {
          var d = new Date(newValue);
          newNode = self.doc.store.rdf.createLiteral(d.toISOString(), triple.object.language, triple.object.datatype);
        }
        else {
          newNode = self.doc.store.rdf.createLiteral(newValue, triple.object.language, triple.object.datatype);
        }

        var newTriple = self.doc.store.rdf.createTriple(triple.subject, triple.predicate, triple.object);
        newTriple[field] = newNode;
        self.doc.updateTriple(triple, newTriple, function(success) {
          // do nothing
        }, function(msg) {
          $(self).trigger('rdf-editor-error', { message: 'Failed to update triple in document: ' + msg });
        });
      };

      self.doc.listProperties(function (pl) {
        console.log('Found existing predicates: ', pl);
        self.doc.store.graph(self.doc.graph, function(success, g) {
          if(success) {
            container.empty();
            var $list = $(document.createElement('table')).addClass('table');
            container.append($list);

            // add index to triples for identification
            var triples = g.toArray();
            for(var i = 0; i < triples.length; i+=1)
              triples[i].id = i;
            // remember last index for triple adding
            $list.data('maxindex', i);

            $list.bootstrapTable({
              striped:true,
              sortName:'s',
              pagination:true,
              search:true,
              searchAlign: 'left',
              showHeader: true,
              editable: true,
              data: triples,
              dataSetter: tripleEditorDataSetter,
              columns: [{
                field: 'subject',
                title: 'Subject',
                aligh: 'left',
                sortable: true,
                editable: function(triple) {
                  return {
                    mode: "inline",
                    type: "rdfnode",
                    rdfnode: {
                      type: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource'
                    },
                    value: triple.subject
                  }
                },
                formatter: nodeFormatter
              }, {
                field: 'predicate',
                title: 'Predicate',
                align: 'left',
                sortable: true,
                editable: function(triple) {
                  return {
                    mode: "inline",
                    type: "propertyBox",
                    propertyBox: {
                      ontoManager: self.ontologyManager
                    },
                    value: triple.predicate.nominalValue
                  };
                },
                formatter: nodeFormatter
              }, {
                field: 'object',
                title: 'Object',
                align: 'left',
                sortable: true,
                editable: function(triple) {
                  return {
                    mode: "inline",
                    type: "rdfnode",
                    value: triple.object
                  };
                },
                formatter: nodeFormatter
              }, {
                field: 'actions',
                title: 'Actions',
                align: 'center',
                valign: 'middle',
                clickToSelect: false,
                editable: false,
                formatter: function(value, row, index) {
                  return [
                    '<a class="remove ml10" href="javascript:void(0)" title="Remove">',
                    '<i class="glyphicon glyphicon-remove"></i>',
                    '</a>'
                  ].join('');
                },
                events: {
                  'click .remove': function (e, value, row, index) {
                    var triple = row;
                    self.doc.deleteTriple(triple, function() {
                      $list.bootstrapTable('remove', {
                        field: 'id',
                        values: [row.id]
                      });
                    }, function() {
                      $(self).trigger('rdf-editor-error', { "type": 'triple-delete-failed', "message": 'Failed to delete triple.' });
                    });
                  }
                }
              }]
            });

            self.tripleTable = $list;

            if (callback)
              callback();
          } else {
            $(self).trigger('rdf-editor-error', 'Failed to query triples from doc.');
          }
        });
      });
    };

    c.prototype.addTriple = function(t) {
      var i = this.tripleTable.data('maxindex');
      i += 1;
      this.tripleTable.bootstrapTable('append', $.extend(t, {
        id: i
      }));
      this.tripleTable.data('maxindex', i);
    };

    return c;
  })();
})(jQuery);

Backbone.Form.editors.Rdfnode = Backbone.Form.editors.Base.extend({

  tagName: 'input',

  events: {
    'change': function() {
        // The 'change' event should be triggered whenever something happens
        // that affects the result of `this.getValue()`.
        this.trigger('change', this);
    },
    'focus': function() {
        // The 'focus' event should be triggered whenever an input within
        // this editor becomes the `document.activeElement`.
        this.trigger('focus', this);
        // This call automatically sets `this.hasFocus` to `true`.
    },
    'blur': function() {
        // The 'blur' event should be triggered whenever an input within
        // this editor stops being the `document.activeElement`.
        this.trigger('blur', this);
        // This call automatically sets `this.hasFocus` to `false`.
    },
    'keyup': function(e, x) {
        if (e.keyCode == 13 && e.shiftKey) {
          console.log('shift+enter');
          if (this.editor) {
            this.editor.transformToTextarea();
          }
          e.stopPropagation();
        }
        this.trigger('keyup', this);
    }
  },

  initialize: function(options) {
    // Call parent constructor
    Backbone.Form.editors.Base.prototype.initialize.call(this, options);
  },

  render: function() {
    var self = this;

    this.$el.attr('type', 'text');
    this.$el.rdfNodeEditor(this.schema.rdfnode);
    self.editor = this.$el.rdfNodeEditor();
    self.setElement(self.editor.getElement());

    $(this.editor).on('change', function() {
      self.trigger('change', this);
    });

    this.setValue(this.value);

    return this;
  },

  getValue: function() {
    return this.editor.getValue();
  },

  setValue: function(value) {
    this.editor.setValue(value);
  },

  focus: function() {
    if (this.hasFocus) return;

    // This method call should result in an input within this editor
    // becoming the `document.activeElement`.
    // This, in turn, should result in this editor's `focus` event
    // being triggered, setting `this.hasFocus` to `true`.
    // See above for more detail.
    this.editor.setEditFocus();
  },

  blur: function() {
    if (!this.hasFocus) return;

    this.editor.blur();
  }
});

/**
 * NestedRdf editor
 *
 * Creates a child form. For editing nested Backbone models
 *
 * Special options:
 *   schema.model:   Embedded model constructor
 */
Backbone.Form.editors.NestedRdf = Backbone.Form.editors.Object.extend({
  initialize: function(options) {
    Backbone.Form.editors.Base.prototype.initialize.call(this, options);

    if (!this.form) throw new Error('Missing required option "form"');
    if (!options.schema.model) throw new Error('Missing required "schema.model" option for NestedRdf editor');
  },

  render: function() {
    //Get the constructor for creating the nested form; i.e. the same constructor as used by the parent form
    var NestedForm = this.form.constructor;

    var data = this.value,
        key = this.key,
        nestedModel = this.schema.model;

    //Wrap the data in a model if it isn't already a model instance
    var modelInstance = data ? data : new nestedModel();

    this.nestedForm = new NestedForm({
      model: modelInstance,
      idPrefix: this.id + '_',
      fieldTemplate: 'nestedField'
    });

    this._observeFormEvents();

    //Render form
    this.$el.html(this.nestedForm.render().el);

    if (this.hasFocus) this.trigger('blur', this);

    return this;
  },

  getValue: function() {
    return {
      "uri": this.nestedForm.model.uri,
      "values": this.nestedForm.getValue()
    };
  }

});

if(!window.RDFE)
  window.RDFE = {};

RDFE.EntityModel = Backbone.Model.extend({
  setEntity: function(doc, uri) {
    this.doc = doc;
    this.uri = uri;
    this.individualsCache = {};
  },

  addValue: function(p, val) {
    var d = this.get(p) || [];
    d.push(val);
    this.set(p, d);
  },

  /**
   * Gets individuals for the given range type from both the document
   * and the ontology manager.
   *
   * Results are cached for performance improvement on larger editor
   * forms.
   */
  getIndividuals: function(range, callback) {
    var self = this;

    // check cache first
    if(this.individualsCache[range]) {
      callback(this.individualsCache[range]);
      return;
    }

    var items = [];

    var rc = this.doc.ontologyManager.ontologyClassByURI(range);

    // get individuals from the ontology manager
    if(!range || range === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource') {
      items = this.doc.ontologyManager.individuals;
    }
    else if(range === 'http://www.w3.org/2000/01/rdf-schema#Class') {
      items = this.doc.ontologyManager.ontologyClasses;
    }
    else if(range === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Property') {
      items = this.doc.ontologyManager.ontologyProperties;
    }
    else {
      if(rc) {
        items = rc.getIndividuals(true);
      }
    }
    // convert the object we get from the ontologyManager into a flat list with labels
    items = _.map(_.values(items), function(cl) {
      var n = new RDFE.RdfNode('uri', cl.URI);
      // FIXME: honor config.labelProps
      n.label = cl.label || cl.name;
      return n;
    });

    // get individuals from the document
    self.doc.listEntities(range, function(el) {
      $.merge(items, el);
    });
    if (rc) {
      var subClasses = rc.getSubClasses(true);
      for (var i = 0, l = subClasses.length; i < l; i++) {
        self.doc.listEntities(subClasses[i].URI, function(el) {
          $.merge(items, el);
        });
      }
    }

    // cache the items for a minor perf improvement
    this.individualsCache[range] = items;

    // return the merged individuals list
    callback(items);
  },

  maxCardinalityForProperty: function(p) {
    for(var i = 0; i < this.types.length; i++) {
      var c = this.types[i].maxCardinalityForProperty(p);
      if(c)
        return c;
    }
    return null;
  },

  restrictionsForProperty: function(p) {
    for(var i = 0; i < this.types.length; i++) {
      var c = this.types[i].restrictions[p];
      if(c)
        return c;
    }
    return null;
  },

  isAggregateProperty: function(p) {
    for(var i = 0; i < this.types.length; i++) {
      if(this.types[i].isAggregateProperty(p))
        return true;
    }
    return false;
  },

  addSchemaEntryForProperty: function(p) {
    var self = this;
    var property = (p.URI ? p : (self.doc.ontologyManager.ontologyProperties[p] || { URI: p }));

    var restrictions = this.restrictionsForProperty(p);
    var restrictionLabel;
    var restrictionComment;
    if (restrictions) {
      restrictionLabel = restrictions["hasCustomLabel"];
      restrictionComment = restrictions["hasCustomComment"];
    }
    var label = RDFE.Utils.createTitle(restrictionLabel || property.label || property.title || RDFE.Utils.uri2name(property.URI))
    var item = {
      titleHTML: '<span title="{0}">{1}</span>'.format(RDFE.Utils.escapeXml(property.URI), label),
      title: label,
      maxCardinality: self.maxCardinalityForProperty(property.URI),
      editorAttrs: {
        "title": RDFE.coalesce(restrictionComment, property.comment, property.description)
      }
    };

    if(self.isAggregateProperty(property.URI)) {
      var range = (property.getRange ? self.doc.ontologyManager.ontologyClassByURI(property.getRange()) : null);
      if(range) {
        item.type = "List";
        item.itemType = "NestedRdf";
        item.model = RDFE.EntityModel.extend({
          defaults: {
            'http://www.w3.org/1999/02/22-rdf-syntax-ns#type': [ property.getRange() ]
          },
          initialize: function(options) {
            RDFE.EntityModel.prototype.initialize.call(this, options);
            this.doc = self.doc;
            this.buildSchemaFromTypes([range]);
          },
          individualsCache: self.individualsCache
        });
        item.editorAttrs.style = "height:auto;"; //FIXME: use editorClass instead
      }
      else {
        console.log('Caution: invalid range on aggregate: ', property);
        item.type = "List";
        item.itemType = "Rdfnode";
        item.rdfnode = {
          "type": "http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource",
          "create": true //FIXME: make this configurable
        };
      }
    }
    else {
      item.type = "List";
      item.itemType = "Rdfnode";
      item.rdfnode = {};

      var pRange = _.result(property, "getRange");

      // TODO: eventually we should support range inheritence
      if (property.class == self.doc.ontologyManager.uriDenormalize('owl:DatatypeProperty')) {
        item.rdfnode.type = pRange;
      }
      else if (property.class == self.doc.ontologyManager.uriDenormalize('owl:ObjectProperty')) {
        item.rdfnode.type = "http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource";
        item.rdfnode.choices = function(callback) { self.getIndividuals(pRange, callback); };
        item.rdfnode.create = true; //FIXME: make this configurable
      }
      else if (pRange) {
        if (pRange == "http://www.w3.org/2000/01/rdf-schema#Literal" ||
            pRange.startsWith('http://www.w3.org/2001/XMLSchema#')) {
          item.rdfnode.type = pRange;
        }
        else {
          item.rdfnode.type = "http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource";
          item.rdfnode.choices = function(callback) { self.getIndividuals(pRange, callback); };
          item.rdfnode.create = true; //FIXME: make this configurable
        }
      }
    }

    self.schema[property.URI] = item;
  },

  buildSchemaFromTypes: function(cTypes) {
    //
    // Get the list of properties (fresnel lens vs. existing properties)
    //
    var self = this;
    self.schema = {};
    self.fields = [];
    self.lens = null;
    self.types = cTypes;

    for (var i = 0, l = cTypes.length; i < l; i++) {
      var lens = cTypes[i].getFresnelLens();
      if(lens && lens.showProperties.length) {
        self.lens = lens;
        break;
      }
    }

    if(lens) {
      // get the fields from the lens, drop the fresnel special since this is only used for empty models
      self.fields = _.without(lens.showProperties, self.doc.ontologyManager.uriDenormalize('fresnel:allProperties'));
    }
    else {
      // no lens - at least show the type
      self.fields = [ self.doc.ontologyManager.uriDenormalize('rdf:type') ];
    }

    //
    // Build the schema from the list of properties
    //
    for(var i = 0; i < self.fields.length; i++) {
      self.addSchemaEntryForProperty(self.fields[i]);
    }
  },

  /// read the properties of this.uri from the store and put them into the model
  docToModel: function(success, fail) {
    var self = this;
    self.schema = {};
    self.fields = [];
    self.ontologyManager = ontologyManager;

    this.doc.getEntity(self.uri, function(entity) {
      // TODO: optionally load the ontologies for this.types. Ideally through a function in the ontology manager, something like getClass()
      //       however, to avoid async code here, it might be better to load the ontologies once the document has been loaded.
      self.types = _.compact(_.map(entity.types, self.doc.ontologyManager.ontologyClassByURI, self.doc.ontologyManager));
      self.fields = [];
      self.lens = null;
      var domainTypes = [];

      //
      // poor-man's inference: if no type is specified, get the types via property domains
      //
      if(self.types.length === 0) {
        for (var prop in entity.properties) {
          var p = self.doc.ontologyManager.ontologyPropertyByURI(prop);
          if(p && p.domain) {
            self.types = _.union(self.types, p.domain);
          }
        }
      }


      //
      // Get the list of properties (fresnel lens vs. existing properties)
      //
      for (var i = 0, l = self.types.length; i < l; i++) {
        var lens =  self.types[i].getFresnelLens();
        if(lens && lens.showProperties.length > 0) {
          self.lens = lens;
          break;
        }
      }

      if(lens) {
        self.fields = _.clone(lens.showProperties);
      }

      if(!lens) {
        // only chow the "Add Property" button if we have fresnel:allProperties in the lens or we have no lens
        self.allowAddProperty = true;

        // build the list of fields from the existing triples.
        for (var prop in entity.properties) {
          if(!_.contains(self.fields, prop)) {
            prop === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' ? self.fields.unshift(prop) : self.fields.push(prop);
          }
        }
      }
      else {
        // replace fresnel:allProperties with the missing properties, rather than appending them
        var j = self.fields.indexOf(self.ontologyManager.uriDenormalize('fresnel:allProperties'));
        if(j >= 0) {
          // only chow the "Add Property" button if we have fresnel:allProperties in the lens or we have no lens
          self.allowAddProperty = true;

          var mp = [];
          for (prop in entity.properties) {
            if(!_.contains(self.fields, prop) && !_.contains(lens.hideProperties, prop))
              mp.push(prop);
          }
          self.fields.splice.apply(self.fields, [j, 1].concat(mp));
        }
      }

      //
      // Build the schema from the list of properties
      //
      for(var i = 0; i < self.fields.length; i++) {
        self.addSchemaEntryForProperty(self.fields[i]);
      }

      //
      // Add the data to the model
      //
      for (var prop in entity.properties) {
        var isAgg = self.isAggregateProperty(prop),
            vals = entity.properties[prop];
        for(var i = 0; i < vals.length; i++) {
          if(isAgg) {
            var subm = new RDFE.EntityModel();
            subm.setEntity (self.doc, vals[i].value);
            subm.individualsCache = self.individualsCache;
            subm.docToModel(function() {
              self.addValue(prop, subm);
            });
          }
          else {
            self.addValue(prop, vals[i]);
          }
        }
      }

      if(success) {
        success();
      }
    });
  },

  /// save the data in the model back to the store
  modelToDoc: function() {

    // A counter for newly created resource URIs. This is necessary since
    // we might be creating multiple new resource URIs in one go without saving them into
    // the document.
    var newResCnt = 1;

    /**
     * Recursively build the triples from the given resource uri and values.
     *
     * @param res The resource/subject URI (can be empty)
     * @param values An object mapping property URIs to lists of values
     * @param doc The RDFE.Document to save to (required for building nodes)
     *
     * @return A list of rdfstore triples.
     */
    function buildTriples(res, values, doc) { // FIXME: add loop-detection
      var t = [];

      // build a new resource uri. We need to use the depth since doc.buildEntityUri()
      // will only check existing uris, not the ones we created here.
      if(!res || res.length === 0) {
        // find a label
        var name = "";
        for(var i = 0, l = doc.config.options.labelProps.length; i < l; i++) {
          if(values[doc.config.options.labelProps[i]]) {
            name = values[doc.config.options.labelProps[i]];
            break;
          }
        }
        name = (name || 'subres') + '_' + newResCnt;
        res = doc.buildEntityUri(name);
        newResCnt++;
      }

      var resNode = doc.store.rdf.createNamedNode(res);

      // iterate the values and create triples for them
      for(prop in values) {
        var propNode = doc.store.rdf.createNamedNode(prop);
        var val = values[prop];
        if (val.constructor !== Array) {
          val = [val];
        }

        for(var k = 0; k < val.length; k++) {
          var v = val[k];

          // nested model
          if(v.values) {
            // merge in tripels from the nested model
            var nt = buildTriples(v.uri, v.values, doc);
            if(nt.length > 0) {
              // include the relation to the sub-resource itself
              // Here we rely on the fact that the main triples come first since we use the first triple's subject as object.
              // The latter is necessary since v.uri might be empty.
              t.push(doc.store.rdf.createTriple(
                resNode,
                propNode,
                nt[0].subject));

              // the triples that make up the sub-resource
              Array.prototype.push.apply(t, nt);
            }
          }
          else {
            var sv = val[k].toStoreNode(doc.store);
            if(sv && sv.nominalValue.length > 0) {

              t.push(doc.store.rdf.createTriple(
                resNode,
                propNode,
                sv));
            }
          }
        }
      }

      return t;
    }

    return function(success, fail) {
      var self = this;
      // recursively build the set of triples to add
      newResCnt = 1;
      var triples = buildTriples(this.uri, self.attributes, self.doc);

      // get the list of triples to delete by gathering the subjects in the triples to add
      var deleteNodes = [];
      for(var i = 0; i < triples.length; i++) {
        if(_.indexOf(deleteNodes, triples[i].subject.nominalValue) < 0) {
          deleteNodes.push(triples[i].subject.nominalValue);
        }
      }

//       console.log('Triples to add', triples);
//       console.log('Nodes to delete first', deleteNodes);

      // first delete all subjects we create
      var saveTriples = function(i) {
        if(i >= deleteNodes.length) {
          // then add all the triples
          self.doc.addTriples(triples, success, fail);
        }
        else {
          self.doc.deleteBySubject(deleteNodes[i], function() {
            saveTriples(i+1);
          }, fail);
        }
      };
      saveTriples(0);
    };
  }()
});

(function($) {
  if (!window.RDFE) {
    window.RDFE = {};
  }

  RDFE.EntityEditor = (function() {
    // constructor
    var c = function(doc, ontoMan) {
      this.doc = doc;
      this.ontologyManager = ontoMan;
    };

    // custom form which allows adding new properties
    var EntityForm = Backbone.Form.extend({
      // Add a "new property" button to the default Backbone-Forms form
      template: _.template('\
        <form class="form-horizontal clearfix" role="form">\
          <a href="#" class="btn btn-default btn-xs pull-right addProp">Add Property</a>\
          <div data-fieldsets></div>\
          <% if (submitButton) { %>\
            <button type="submit" class="btn"><%= submitButton %></button>\
          <% } %>\
        </form>\
      '),

      render: function() {
        var self = this;

        Backbone.Form.prototype.render.call(this);

        if(!self.model.allowAddProperty) {
          this.$el.find('.addProp').hide();
        }

        // we only want to find our own button, not the ones from nested forms
        this.$el.find('> a.addProp').click(function(e) {
          e.preventDefault();

          // open the new property editor
          var ps = $(document.createElement('select')),
              addBtn = $(document.createElement('button')).addClass('btn').addClass('btn-default').text('Add'),
              cnclBtn = $(document.createElement('button')).addClass('btn').addClass('btn-default').text('Cancel');

          var c = $(document.createElement('div'))
            .append($(document.createElement('span')).text('New Property:'))
            .append(ps)
            .append(addBtn)
            .append(cnclBtn);

          ps = ps.propertyBox({
            "ontoManager": self.model.doc.ontologyManager
          });

          cnclBtn.click(function(e) {
            e.preventDefault();
            c.remove();
          });
          addBtn.click(function(e) {
            e.preventDefault();
            if(ps.selectedURI()) {
              console.log('Adding new property', ps.selectedURI(), 'to form', self);

              // commit the changes to the model
              self.commit();

              // add the new property
              self.model.addSchemaEntryForProperty(ps.selectedProperty());
              self.model.fields.push(ps.selectedURI());

              // update the form's state. We need to reset the fieldsets to force Backbone.Form to re-create them
              self.fieldsets = undefined;
              self.initialize(self.options);

              // remove the add property form
              c.remove();

              // rebuild ui
              var container = self.$el.parent();
              self.$el.remove();
              self.render();
              console.log(container, self.$el)
              container.append(self.$el);
            }
            else {
              console.log('No prop selected')
            }
          });

          self.$el.prepend(c);
        });

        return this;
      }
    });

    c.prototype.template = _.template('<div class="panel panel-default">\
        <div class="panel-heading clearfix">\
          <h3 class="panel-title pull-left">Editing <a href="<%= entityUri %>"><span class="entity-label"><%= entityLabel %><span></a> <span class="entity-types"></span></h3>\
          <div class="btn-group pull-right" role="group">\
            <button type="button" class="btn btn-primary btn-sm" id="okBtn">Apply</button>\
            <button type="button" class="btn btn-default btn-sm" id="cnclBtn">Cancel</button>\
          </div>\
        </div>\
        <div class="panel-body" id="entityFormContainer">\
        </div>\
      </div>');

    c.prototype.render = function(container, url, closeCb) {
      var self = this;
      var model = new RDFE.EntityModel();
      model.setEntity(this.doc, url);
      model.docToModel(function() {
        var form = new EntityForm({
          "model": model
        });
        form.render();

        container.empty();

        // create the basic entity editor layout using the template above
        container.append(self.template({
          entityUri: url,
          entityLabel: RDFE.Utils.uri2name(url)
        }));
        self.doc.getEntity(url, function(entity) {
          container.find('.entity-types').html(self.ontologyManager.typesToLabel(entity.types, true));
          container.find('.entity-label').html(entity.label);
        });

        // add the newly created form to the container
        container.find('#entityFormContainer').append(form.el);

        // small hack to resize toggle buttons
        container.find('.toggle.btn').css('width', '100%');

        // add click handlers to our buttons (we have three handlers because we used to have three buttons)
        var cancelBtn = container.find('button#cnclBtn');
        var saveBtn = container.find('button#saveBtn');
        var okBtn = container.find('button#okBtn');
        cancelBtn.click(function() {
          closeCb();
        });
        var saveFnct = function(cb) {
          form.commit();
          model.modelToDoc(function() {
            $(self).trigger('rdf-editor-success', {
              "type": 'editor-form-save-done',
              "message": "Locally saved details of " + url
            });
            if(cb) {
              cb();
            }
          }, function(msg) {
            $(self).trigger('rdf-editor-error', {
              "type": 'editor-form-save-failed',
              "message": msg
            });
          });
        };
        saveBtn.click(function() {
          saveFnct();
        });
        okBtn.click(function() {
          saveFnct(closeCb);
        });
      }, function(msg) {
        $(self).trigger('rdf-editor-error', {
          "type": 'editor-form-creation-failed',
          "message": msg
        });
      });
    };

    return c;
  })();
})(jQuery);

(function($) {
  if (!window.RDFE) {
    window.RDFE = {};
  }

  RDFE.EntityView = (function() {
    // constructor
    var c = function(doc, ontoMan, params) {
      this.doc = doc;
      this.ontologyManager = ontoMan;
      this.editFct = params.editFct;
    };

    var labelFormatter = function(value, row, index) {
      if(row.types && row.types.length) {
        return row.label + ' <small>(' + row.types + ')</small>';
      }
      else {
        return row.label;
      }
    };

    var entityListActionsFormatter = function(value, row, index) {
      return [
        '<a class="edit ml10" href="javascript:void(0)" title="Edit">',
        '  <i class="glyphicon glyphicon-edit"></i>',
        '</a>',
        '<a class="remove ml10" href="javascript:void(0)" title="Remove">',
        '  <i class="glyphicon glyphicon-remove"></i>',
        '</a>'
      ].join('');
    };

    /**
     * Convert an entity object as returns by Document.listEntities or
     * Document.getEntity into a row for the entity table.
     */
    var docEntityToRow = function(entity, ontoMan) {
      return {
        'label': entity.label,
        'types': ontoMan.typesToLabel(entity.types),
        'uri': entity.uri || entity.value
      };
    };

    c.prototype.render = function(container, callback) {
      var self = this;

      self.doc.listEntities(function(el) {
        self.entityTable = null;
        container.empty();

        var $list = $(document.createElement('table')).addClass('table');
        container.append($list);

        // create entries
        var entityData = [];
        for (var i = 0; i < el.length; i++) {
          entityData.push(docEntityToRow(el[i], self.ontologyManager));
        }

        var deleteFct = function(uri) {
          self.doc.deleteEntity(uri, function() {
            $list.bootstrapTable('remove', {
              field: 'uri',
              values: [uri]
            });
            $(self).trigger('rdf-editor-success', {
              "type": 'entity-delete-done',
              "uri": uri,
              "message": "Successfully deleted entity " + uri + "."
            });
          }, function(msg) {
            $(self).trigger('rdf-editor-error', {
              "type": 'entity-delete-failed',
              "message": msg
            });
          });
        };

        $list.bootstrapTable({
          striped: true,
          sortName: 'label',
          pagination: true,
          search: true,
          searchAlign: 'left',
          trimOnSearch: false,
          showHeader: true,
          data: entityData,
          idField: 'uri',
          columns: [{
            field: 'label',
            title: 'Entity Name',
            aligh: 'left',
            sortable: true,
            formatter: labelFormatter
          }, {
            field: 'actions',
            title: 'Actions',
            align: 'center',
            valign: 'middle',
            clickToSelect: false,
            formatter: entityListActionsFormatter,
            events: {
              'click .edit': function(e, value, row, index) {
                self.editFct(row.uri);
              },
              'click .remove': function(e, value, row, index) {
                deleteFct(row.uri);
              }
            }
          }]
        });
        self.entityTable = $list;

        if (callback)
          callback();
      }, function(r) {
        $(self).trigger('rdf-editor-error', {
          "type": 'entity-list-failed',
          "message": r
        });
      });
    };

    c.prototype.addEntity = function(entity) {
      this.entityTable.bootstrapTable('append', entity);
    };

    /**
     * Fetch details about the given entity from the document and update them in the table.
     */
    c.prototype.updateEntity = function(uri) {
      var self = this;
      self.doc.getEntity(uri, function(e) {
        self.entityTable.bootstrapTable('update', {
          field: 'uri',
          data: docEntityToRow(e, self.ontologyManager)
        });
      });
    };

    return c;
  })();
})(jQuery);

if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function(str) {
    return this.indexOf(str) == 0;
  };
}

if(!window.RDFE)
  window.RDFE = {};

RDFE.Editor = function(config, options) {
  var self = this;
  var options = $.extend({"initOntologyManager": true}, options);

  // initialize our ontology manager
  this.ontologyManager = new RDFE.OntologyManager(config.options);
  if (options.initOntologyManager === true) {
    this.ontologyManager.init();
  }

  // create our main document
  this.doc = new RDFE.Document(this.ontologyManager, config);

  // store the config for future access
  this.config = config;
};

RDFE.Editor.prototype.render = function(container) {
  this.container = container;

  this.container.empty();

  this.listContainer = $(document.createElement('div')).appendTo(this.container);
  this.formContainer = $(document.createElement('div')).appendTo(this.container);

  this.toggleView(this.config.options.defaultView);
};

/**
 * Get the name of the current view mode.
 *
 * @return The current view mode which is either @p entites,
 * @p triples or @p undefined in case render() has not been
 * called yet.
 */
RDFE.Editor.prototype.currentView = function() {
  return this._currentView;
};

/**
 * Toggle the view to the given @p view mode.
 * Nothing is done if the given @p view is already
 * the current one.
 */
RDFE.Editor.prototype.toggleView = function(view) {
  if(view !== this._currentView) {
    if (view === 'triples') {
      this.createTripleList();
      this._currentView = "triples";
    }
    else {
      this.createEntityList();
      this._currentView = "entities";
    }
  }
};

/**
 * Forcefully update the contents in the current view.
 */
RDFE.Editor.prototype.updateView = function() {
  if(this._currentView === 'triples') {
    this.createTripleList();
  }
  else if(this._currentView === 'entities') {
    this.createEntityList();
  }
};

RDFE.Editor.prototype.createTripleList = function() {
  var self = this;

  $(self).trigger('rdf-editor-start', {
    "id": "render-triple-list",
    "message": "Loading Triples..."
  });

  if(!this.tripleView) {
    this.tripleView = new RDFE.TripleView(this.doc, this.ontologyManager);
    $(self.tripleView).on('rdf-editor-error', function(e, d) {
      $(self).trigger('rdf-editor-error', d);
    }).on('rdf-editor-success', function(e, d) {
      $(self).trigger('rdf-editor-success', d);
    });
  }
  this.formContainer.hide();
  this.listContainer.empty().show();
  this.tripleView.render(self.listContainer, function() {
    $(self).trigger('rdf-editor-done', { "id": "render-triple-list" });
  });
};

RDFE.Editor.prototype.createNewStatementEditor = function() {
  var self = this;

  if (!this.doc) {
    return false;
  }

  self.listContainer.hide();
  self.formContainer.html(' \
      <div class="panel panel-default"> \
      <div class="panel-heading"><h3 class="panel-title">Add new Triple</h3></div> \
      <div class="panel-body"><div class="form-horizontal"> \
      <div class="form-group"><label for="subject" class="col-sm-2 control-label">Subject</label> \
      <div class="col-sm-10"><input name="subject" class="form-control" /></div></div> \
      <div class="form-group"><label for="predicate" class="col-sm-2 control-label">Predicate</label> \
      <div class="col-sm-10"><select name="predicate" class="form-control"></select></div></div> \
      <div class="form-group"><label for="object" class="col-sm-2 control-label">Object</label> \
      <div class="col-sm-10"><input name="object" class="form-control" /></div></div> \
      <div class="form-group"><div class="col-sm-10 col-sm-offset-2"><a href="#" class="btn btn-default triple-action triple-action-new-cancel">Cancel</a> \
        <a href="#" class="btn btn-primary triple-action triple-action-new-save">OK</a></div></div> \
      </form></div></div>\n').show();

  var objEd = self.formContainer.find('input[name="object"]').rdfNodeEditor();
  var propEd = self.formContainer.find('select[name="predicate"]').propertyBox({
    ontoManager: self.ontologyManager
  }).on('changed', function(e, p) {
    console.log('changed', p)
    var cn = objEd.getValue(), n;
    var range = p.getRange();
    if(objEd.isLiteralType(range)) {
      n = new RDFE.RdfNode('literal', cn.value, range, cn.language);
    }
    else if(self.ontologyManager.ontologyClassByURI(range)) {
      n = new RDFE.RdfNode('uri', cn.value);
    }
    else {
      n = new RDFE.RdfNode('literal', cn.value, null, '');
    }
    objEd.setValue(n);
  });

  self.formContainer.find('a.triple-action-new-cancel').click(function(e) {
    self.createTripleList();
  });

  self.formContainer.find('a.triple-action-new-save').click(function(e) {
    var s = self.formContainer.find('input[name="subject"]').val();
    var p = propEd.selectedURI();
    var o = objEd.getValue();
    var t = self.doc.store.rdf.createTriple(self.doc.store.rdf.createNamedNode(s), self.doc.store.rdf.createNamedNode(p), o.toStoreNode(self.doc.store));
    self.doc.addTriples([t], function() {
      if (self.tripleView) {
        self.tripleView.addTriple(t);
      }
      $(self).trigger('rdf-editor-success', {
        "type": "triple-insert-success",
        "message": "Successfully added new triple."
      });

      self.createTripleList();
    }, function() {
      $(self).trigger('rdf-editor-error', {
        "type": 'triple-insert-failed',
        "message": "Failed to add new triple to store."
      });
    });
  });
};

RDFE.Editor.prototype.createNewEntityEditor = function(forcedType) {
  var self = this;
  var $ontologiesSelect, ontologiesSelect;
  var $classesSelect, classesSelect;

  var classesList = function (e) {
    var ontology = self.ontologyManager.ontologyByURI(e.currentTarget.selectedOntologyURI());
    classesSelect.clearOptions();
    classesSelect.addOption(ontology ? ontology.classesAsArray() : self.ontologyManager.allClasses());
  };

  if (!this.doc) {
    return false;
  }


  this.listContainer.hide();
  this.formContainer.show();

  if (!forcedType) {
    self.formContainer.html(
      '<div class="panel panel-default">' +
      '<div class="panel-heading"><h3 class="panel-title">Add new Entity</h3></div>' +
      '<div class="panel-body"><div class="form-horizontal"> ' +
      '  <div class="form-group"> ' +
      '    <label for="ontology" class="col-sm-2 control-label">Ontology</label> ' +
      '    <div class="col-sm-10"> ' +
      '      <select name="ontology" id="ontology" class="form-control" /> ' +
      '    </div> ' +
      '  </div> ' +
      '  <div class="form-group"> ' +
      '    <label for="class" class="col-sm-2 control-label">Type</label> ' +
      '    <div class="col-sm-10"> ' +
      '      <select name="class" id="class" class="form-control" /> ' +
      '    </div> ' +
      '  </div> ' +
      '  <div class="form-group"> ' +
      '     <label for="subject" class="col-sm-2 control-label">Entity URI</label> ' +
      '     <div class="col-sm-10"> ' +
      '       <input name="subject" id="subject" class="form-control" /> ' +
      '     </div> ' +
      '  </div> ' +
      '  <div class="form-group"> ' +
      '    <div class="col-sm-10 col-sm-offset-2"> ' +
      '      <a href="#" class="btn btn-default triple-action triple-action-new-cancel">Cancel</a> ' +
      '      <a href="#" class="btn btn-primary triple-action triple-action-new-save">OK</a> ' +
      '    </div> ' +
      '  </div> ' +
      '</div></div></div>\n');

    ontologiesSelect = $('#ontology').ontoBox({ "ontoManager": self.ontologyManager });
    ontologiesSelect.on('changed', classesList);
    ontologiesSelect.sel.focus();

    // FIXME: this is all pretty much the same as in the PropertyBox, in any case it should be moved into a separate class/file
    $classesSelect = $('#class').selectize({
      create: true,
      valueField: 'URI',
      labelField: 'URI',
      searchField: [ "title", "label", "prefix", "URI" ],
      sortField: [ "prefix", "URI" ],
      options: self.ontologyManager.allClasses(),
      create: function(input, cb) {
        // search for and optionally create a new class
        cb(self.ontologyManager.ontologyClassByURI(self.ontologyManager.uriDenormalize(input), true));
      },
      render: {
        item: function(item, escape) {
          var x = item.title || item.label || name.curi || item.name;
          if(item.curi && item.curi != x) {
            x = escape(x) + ' <small>(' + escape(item.curi) + ')</small>';
          }
          else {
            x = escape(x);
          }
          return '<div>' + x + '</div>';
        },
        option: function(item, escape) {
          return '<div>' + escape(item.title || item.label || name.curi || item.name) + '<br/><small>(' + escape(item.URI) + ')</small></div>';
        },
        'option_create': function(data, escape) {
          var url = self.ontologyManager.uriDenormalize(data.input);
          if (url != data.input)
            return '<div class="create">Add <strong>' + escape(data.input) + '</strong> <small>(' + escape(url) + ')</small>&hellip;</div>';
          else
            return '<div class="create">Add <strong>' + escape(url) + '</strong>&hellip;</div>';
        }
      }
    });
    classesSelect = $classesSelect[0].selectize;
  }
  else {
    var forcedTypeRes = self.ontologyManager.ontologyClassByURI(forcedType);
    var forcedTypeLabel = forcedTypeRes ? forcedTypeRes.label : RDFE.Utils.uri2name(forcedType);
    self.formContainer.html(
      '<div class="panel panel-default">' +
      '<div class="panel-heading"><h3 class="panel-title">Add new Entity</h3></div>' +
      '<div class="panel-body"><div class="form-horizontal"> ' +
      '  <div class="form-group"> ' +
      '    <label for="class" class="col-sm-2 control-label">Type</label> ' +
      '    <div class="col-sm-10"> ' +
      '      <p class="form-control-static" title="' + forcedType + '">' + forcedTypeLabel + '</p>' +
      '    </div> ' +
      '  </div> ' +
      '  <div class="form-group"> ' +
      '     <label for="subject" class="col-sm-2 control-label">Entity URI</label> ' +
      '     <div class="col-sm-10"> ' +
      '       <input name="subject" id="subject" class="form-control" /> ' +
      '     </div> ' +
      '  </div> ' +
      '  <div class="form-group"> ' +
      '    <div class="col-sm-10 col-sm-offset-2"> ' +
      '      <a href="#" class="btn btn-default triple-action triple-action-new-cancel">Cancel</a> ' +
      '      <a href="#" class="btn btn-primary triple-action triple-action-new-save">OK</a> ' +
      '    </div> ' +
      '  </div> ' +
      '</div></div></div>\n');
    self.formContainer.find('input#subject').focus();
  }

  // if we have an entity uri template we ask the user to provide a nem instead of the uri
  if(this.config.options.entityUriTmpl) {
    self.formContainer.find('label[for="subject"]').text('Entity Name');
  }

  self.formContainer.find('a.triple-action-new-cancel').click(function(e) {
    self.listContainer.show();
    self.formContainer.hide();
  });

  var saveFct = function() {
    var uri = self.formContainer.find('input[name="subject"]').val(),
        name = null,
        type = forcedType || self.formContainer.find('#class')[0].selectize.getValue();

    if(self.config.options.entityUriTmpl) {
      name = uri;
      uri = null;
    }

    self.doc.addEntity(uri, name, type, function(ent) {
      if (self.entityView) {
        self.entityView.addEntity(ent);
      }

      $(self).trigger('rdf-editor-success', {
        "type": "entity-insert-success",
        "message": "Successfully created new entity."
      });

      // once the new entity is created we open the editor
      self.editEntity(ent.uri);
    }, function() {
      $(self).trigger('rdf-editor-error', {
        "type": 'triple-insert-failed',
        "message": "Failed to add new triple to store."
      });
    });
  };

  self.formContainer.find('a.triple-action-new-save').click(function(e) {
    saveFct();
  });

  self.formContainer.find('input#subject').keypress(function(e) {
    if(e.which === 13) {
      saveFct();
    }
  })
};

RDFE.Editor.prototype.createEntityList = function() {
  var self = this;

  $(self).trigger('rdf-editor-start', {
    "id": "render-entity-list",
    "message": "Loading Entities..."
  });

  if(!self.entityView) {
    self.entityView = new RDFE.EntityView(this.doc, this.ontologyManager, {
      editFct: function(uri) {
        self.editEntity.call(self, uri);
      }
    });
    $(self.entityView).on('rdf-editor-error', function(e) {
      $(self).trigger('rdf-editor-error', d);
    }).on('rdf-editor-success', function(e, d) {
      $(self).trigger('rdf-editor-success', d);
    });
  }

  self.formContainer.hide();
  self.listContainer.empty().show();
  self.entityView.render(self.listContainer, function() {
    $(self).trigger('rdf-editor-done', {
      "id": "render-entity-list"
    });
  });
};

RDFE.Editor.prototype.editEntity = function(uri) {
  var self = this;
  if(!self.entityEditor) {
    self.entityEditor = new RDFE.EntityEditor(self.doc, self.ontologyManager);
    $(self.entityEditor).on('rdf-editor-error', function(e) {
      $(self).trigger('rdf-editor-error', d);
    }).on('rdf-editor-success', function(e, d) {
      $(self).trigger('rdf-editor-success', d);
    });
  }

  // render the entity editor and re-create the entity list once the editor is done
  self.listContainer.hide();
  self.formContainer.show();
  self.entityEditor.render(self.formContainer, uri, function() {
    self.formContainer.hide();
    self.listContainer.show();
    self.entityView.updateEntity(uri);
  });
};
