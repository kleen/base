/*
 base.js 基于miniui和jquery的高级封装
 */
/*
 *  快捷方法
 * */
var toString = Object.prototype.toString;
var nativeSlice = Array.prototype.slice;
/**
 *
 * 说明: 基础方法
 * @param  {string} tadId
 * @returns {undefined}
 */

var ebapBase = (function() {
    var ebapModules = {};
    var ebapInstance = null;
    var isParsed = false;
    var winLoc = window.location;
    var winLocSearch = winLoc.search;
    var win = window;
    // 判断某个环境下是否存在某个库是否支持某个方法
    function support(libName,funcName,context) {
        var __context = context ? context : window;
        return (typeof __context[libName] !=='undefined') && __context[libName][funcName];
    }
    // 判断miniui是否支持某个方法
    function miniSupport(methodName) {
        return support('mini', methodName);
    }
    /**
     * 执行某个对象上的某个方法，也可以注入参数
     * @param {node} elm
     * @param {string} method
     * @returns
     */
    function _execute(elm,method) {
        var _method = method;
        var arg = Array.prototype.slice.call(arguments,2);
        return elm[_method] && elm[_method].apply(this,arg);
    }
    /**
     * 判断某个特定的dom元素是否存在
     * @param {any} elm
     * @param {any} targetInfo
     * @returns
     */
    function _isExistTarget(elm,targetInfo) {
        if (execute(elm.tagName, 'toUpperCase') === execute(targetInfo.tagName, 'toUpperCase') && (execute(elm.className,'indexOf', targetInfo.cls)!== -1) || elm.id === targetInfo.id) {
            return true
        }
        return false
    }
    /**
     * 事件代理
     * @param {domNode} proxyNode
     * @param {object} targetInfo
     * @param {function} callback
     */
    function _eventProxy(proxyNode, targetInfo, callback) {
        proxyNode.click(function(e) {
            if (_isExistTarget(e.target, targetInfo)) {
                targetInfo = $.extend({}, targetInfo, { level: 0, dom: e.target});
                callback(targetInfo);
                return undefined
            }
            $(e.target).parents(proxyNode).each(function(idx,elm) {
                if (_isExistTarget(elm, targetInfo)) {
                    targetInfo = $.extend({}, targetInfo, { level: idx+1,dom: e.target});
                    callback(targetInfo)
                    //忽略后续的比较 跳出each函数 from http://www.jb51.net/article/50711.htm
                    return false;
                }
            });
        })
    }
    /**
     * 说明: 自动获取指定区域的input,textarea的值并将其加入到bccparams
     * @param  {jquery object} $els
     * @param {object} bccparams
     **/
    function autoInput($els, ebapparams) {
        $els.on('input', function(event) {
            if (event.target.value.length === 0) {
                delete ebapparams[event.target.name];
            } else {
                ebapparams[event.target.name] = event.target.value;
            }
        });
        if (document.all) {
            $els.each(function() {
                var that = this;
                if (this.attachEvent) {
                    this.attachEvent('onpropertychange', function(e) {
                        if (e.propertyName != 'value') return;
                        $(that).trigger('input');
                    });
                }
            });
        }
    };
    /**
     * 说明: 对multiselect组件onchange事件的封装
     * @param  {object} options
     * @param {boolean} checked ’
     * @param {element} select
     * @param {object} bccparams
     **/
    function multiChangeHandler(option, checked, key, ebapparams) {
        var _multiKey = key
        if (checked) {
            ebapparams[_multiKey] = option[0].value;
        } else {
            ebapparams[_multiKey] = '';
        }
    }
    function  setUp (func) {
        typeof func === 'function' && func.apply(null, nativeSlice.call(arguments, 1));
        return this;
    }
    var _cacheEbapIns = null;
    /*
     配置文件
     * */
    var config = {
        root: window['ctx'],
        injectRules: {
            'normal': function() {
                rules['mixin'][0][rules.method]();
            },
            'ifelse': function(rules) {
                if (rkFlist.mode = 'line-add') {
                    rules['mixin'][0][rules.method]();
                } else {
                    rules['mixin'].forEach(function(i, f) {
                        if (i >= 1) {
                            f[rules.method]()
                        }
                    });
                }
            },
            'combine': function() {
                rules['mixin'].forEach(function(i, f) {
                    f[rules.method]()
                });
            }
        },
        deps: {},
        enableList: {
            open: true,
            decode: true,
            encode: true
        },
        openFilterRules: ['onload', 'ondestroy']
    };
    /**
     * 说明: 项目常用的工具方法
     **/
    var utils = {
        actionTypes: ['ebap-tbActionAdd','ebap-tbActionDelete','ebap-tbActionModify','ebap-tbActionAssign','ebap-actionType'],
        toggleEnable: function(obj) {
            $.extend(config['enableList'], obj);
        },
        // 通过id获取某个miniui实例
        getInstance: function(options, type) {
            var cacheInstance = null;
            if (typeof options === 'string') {
                var options = {
                    id: options
                }
            }
            if (type && String(type) === 'form') {
                return new mini.Form(options.id);
            }
            cacheInstance = utils.created(options);
            if (options.deps && options.deps.length >= 1) {
                $.extend(cacheInstance, {
                    deps: utils.genDepsIns(options.deps, true)
                });
            }
            return cacheInstance;
        },
        get: get,
        genOpenCfg: function(openCfg) {
            var _cfg = {};
            $.each(openCfg, function(i, cfg) {
                if ($.inArr(cfg['filter'] || cfg.openFilterRules, i) > -1) {
                    _cfg[i] = function(action) {
                        action ? cfg[i](action) : cfg[i]();
                    }
                }
                _cfg[i] = cfg[i];
            })
            return _cfg;
        },
        open: function(openCfg) {
            var newOpenCfg = utils.genOenCfg(openCfg);
            miniSupport('open')(newOpenCfg);
        },
        genDepsIns: function (deps,flag) {
            var _deps = {};
            var deps = (deps && deps.length>=0) ? deps : [];
            for (var d = 0, dl = deps.length; d < dl; d++) {
                if (flag) {
                    _deps[deps[d].key] = utils.getInstance(deps[d])
                } else {
                    _deps[deps[d].key] = utils.get(deps[d])
                }
            }
            return _deps;
        },
        created: function(options) {
            _cacheEbapIns = miniSupport('get')(options.id);
            options['created'] && typeof options['created'] === 'function' && options['created'](_cacheEbapIns)
            return _cacheEbapIns;
        },
        seekOptions: function(options, ins) {
            for (var o in options) {
                if (typeof options[o] === 'function') {
                    options[o](ins);
                }
            }
        },
        // 自动绑定事件,并执行相应的策略,用于表格中事件处理
        proxyTrigger: function(func,context,strategy) {
            var _triggerInfo = null;
            var _triggerClsName = null;
            var self = this;
            context.click(function(e) {
                if (e.target.tagName === 'A') {6
                    _triggerInfo = e.target.className.split(' ')[1].split('-')[2];
                    _triggerClsName = e.target.className.split(' ')[0];
                }
                // console.clear();
                if (typeof strategy ==='string' && self.isAandHasCls(e.target,_triggerClsName,strategy)) {
                    console.log('_triggerClsInfo',_triggerInfo,_triggerClsName,strategy);
                    e.preventDefault();
                    func(_triggerInfo);
                }
            });
        },
        extendInjectRules: function (rule) {
            if ($.isPlainObject(rule)) {
                for (var r in rule) {
                    if (rule.hasOwnProperty(r)) {
                        config.injectRules[r] = rule[r]
                    }
                }
                return true;
            }
            return false;
        },
        eventProxy: _eventProxy,
        autoProxyTrigger: function(cfg,context) {
            for (var icfg in cfg) {
                if (cfg.hasOwnProperty(icfg)) {
                    this.proxyTrigger(cfg[icfg],context,icfg);
                }
            }
        },
        getIns: function() {
            var insId = this.insId || '';
            var moduleType = this.moduleType;
            return utils.getInstance({ id: insId }, moduleType);
        },
        hackIe: function (verStr, func) {
            if ($.inArray(verStr.split(' '), document.documentMode.toString())>-1) {
                func.apply(null, nativeSlice.call(arguments).length>2 && nativeSlice.call(arguments, 2))
            }
        },
        inject: function(options) {
            return function() {
                config.injectRules[options.rule](options.mixin)
            }
        },
        extend: function () {
            var _extendObj = {};
            $.each( Array.prototype.slice.call(arguments), function(i, arg) {
                _extendObj = $.extend(_extendObj, arg);
            })
            $.extend(this, _extendObj);
            return this;
        },
        //获取字典标签 ebapBase.utils.getDictLabel
        getDictLabel: function getDictLabel(data, value, defaultValue){
            for (var i=0; i<data.length; i++){
                var ebapDictRows = data[i];
                if (ebapDictRows.value == value){
                    return ebapDictRows.label;
                }
            }
            return defaultValue;
        },
        autoInput: autoInput,
        // 设置实例的urls
        setUrls: function(obj) {
            if (toString.call(obj) === '[object Object]') {
                for ( var ukType in obj) {
                    if (ukType.toLowerCase().slice(-3) === 'url') {
                        this.settings && (this.settings[ukType] = utils.prefixPath(obj[ukType]));
                    } else {
                        this.settings && (this.settings[ukType + 'Url'] = utils.prefixPath(obj[ukType]));
                    }
                }
            }
        },
        resetRoot: function (root) {
            root && config['root'];
        },
        // 判断miniui是否支持编码
        encode: support('mini', 'encode') ?support('mini', 'encode') : function () {},
        // 判断miniui是否支持解码
        decode:support('mini', 'decode')? support('mini', 'decode') : function () {},
        clone: support('mini', 'clone') ? support('mini', 'clone'): function () {},
        // 自动为url加入根路径ctx
        prefixPath: function (url, ctx) {
            return typeof config.root !== 'undefined' ? config.root + (url || '') : ( url || '')
        },
        // 封装ajax进行更多控制
        ajax: function (options) {
            var ajaxOpts = $.extend({
                contentType: "application/json",
                dataType: 'json',
                cache: false,
                success: function ( data, textStatus, jqXHR ) {
                    options.success && options.success(data, textStatus, jqXHR);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    options.error && (options.error(jqXHR, textStatus, errorThrown));
                }
            }, options);
            $.ajax(ajaxOpts);
        },
        // 通用的交互操作
        actions: {
            close: function (action, ebapFormIns, context ,data) {
                if (action == 'close' && ebapFormIns.isChanged()) {
                    if (confirm("数据被修改了，是否先保存？")) {
                        return false;
                    }
                }
                if (window.CloseOwnerWindow) {
                    return window.CloseOwnerWindow(action);
                } else {
                    window.close();
                }
            }
        },
        support: support
    };
    var ebapUtils = utils;
    // 如果页面超时，将页面重置到登录页
    function loginOut(url) {
        if (winLocSearch.length === 0 && win == win.parent) {
            win.location.herf = utils.prefixPath(url);
        } else if (winLocSearch.length === 0 && win != win.parent) {
            win = win.top;
            win.location.reload();
        }
    }
    /*
     *  登入登出控制
     * */
    var ebapLogin = function (options) {
        var loginUrl = options.url || '/a/login';
        var self = {
            out: function() {
                loginOut(loginUrl);
            },
            in: function () {

            }
        }
        return self;
    }
    /*
     *  自定义弹出框通用逻辑
     * */
    var ebapModal = function (options) {
        var detailInfoState = {
            cur: '0',
            '0': '收起详情',
            '1': '查看详情'
        };
        var tplCfg = $.extend({},
            {
                desc: '',
                detailInfo: ''
            },
            options.tplCfg
        );
        var selector = options.selector || '.ebap-maskContainer';
        var context = options.context || document;
        //<button class="btn btn-warning ebap-modal-closeBtn"><i class="fa fa-power-off"></i>关闭</button>
        var defaultConfirmTpl = function (tplCfg) {
            return (
            '<div class="ebap-maskContainer">'
            + '<div class="ebap-modalCnt">'
            + '<div class="ebap-modal-tips"><div class="ebap-confirmSure ebap-modal-tipsCnt"><i class="fa fa-warning"></i>错误信息提示</div><button class="ebap-btn ebap-btn-warning ebap-modal-closeBtn"><i class="fa fa-power-off"></i>关闭</button></div>'
            + '<div class="ebap-modal-msgDesc ebap-modal-tipsCnt"><p class="ebap-modal-modalDescp">'+ tplCfg.desc+'</p></div>'
            + '<div class="ebap-modal-msgDetail ebap-modal-msgDetailHidden"><h3 class="ebap-modal-errorTitle">详细信息</h3>' + ebapModal.getDetailInfo(tplCfg.detailInfo) + '</div>'
            + '<div class="ebap-modal-actions">'
            + '<button class="ebap-modal-confirmBtn ebap-btn ebap-btn-info"><i class="fa fa-info-circle"></i>查看详情</button></div></div>'
            );
        }
        function clearMask(selector) {
            selector.length>0 && selector.remove();
        }
        function insertModalNode(context, tplCnt, selector, func) {
            if ( $('body', context).eq(0).find('script').length>0 ) {
                $('body', context).eq(0).find('script').eq(0).before(tplCnt);
            } else {
                $('body', context).eq(0).append(tplCnt);
            }
            func(selector, context);
        }
        function activeDefaultAction (selector, context) {
            $(selector + ' .ebap-modal-closeBtn', context).click(function(event) {
                $(selector, context).fadeOut();
                return false;
            });
            $(selector + ' .ebap-modal-confirmBtn', context).click(function(event) {
                $(selector + ' .ebap-modal-msgDetail', context)[(detailInfoState.cur === '0' ? 'fadeIn' : 'fadeOut')](0);
                if (event.target.tagName.toLowerCase() === 'i') {
                    $(event.target).parent().html('<i class="fa fa-info-circle"></i>' + detailInfoState[detailInfoState.cur]);
                } else {
                    $(event.target).html('<i class="fa fa-info-circle"></i>' + detailInfoState[detailInfoState.cur]);
                }
                detailInfoState.cur === '0' ? detailInfoState.cur = '1' : detailInfoState.cur = '0';
            });
        }
        function genConfirmModalCnt(tplCfg, selector,context) {
            var tplCnt = defaultConfirmTpl(tplCfg);
            insertModalNode(context, tplCnt, selector, activeDefaultAction);
            $(selector + ' .ebap-modal-detailCon', context).css({
                'height': (parseInt($(context).height()*0.48, 10) - 120) + 'px'
            });
            window.top.onresize = function() {
                $(selector + ' .ebap-modal-detailCon', context).css({
                    'height': (parseInt($(context).height()*0.48, 10) - 120) + 'px'
                });
            }
        }

        function showConfirmModal(tplCfg, selector, context) {
            var $selector = $(selector, context);
            clearMask($selector);
            if ($selector.length > 0) {
                $selector.fadeIn();
            } else {
                genConfirmModalCnt(tplCfg, selector, context);
            }
        }
        showConfirmModal(tplCfg, selector, context);
        return {
            show: function () {
                $(selector, context).fadeIn();
                return this;
            },
            hide: function () {
                $(selector, context).fadeOut();
                return this;
            }
        }
    };
    ebapModal.getDetailInfo = function (info) {
        var _info = [];
        if (Object.prototype.toString.call(info) !== '[object Array]') {
            info = !info ?  [] : [info];
        }
        $.each(info, function(_, ifo) {
            _info.push('<li><span class="ebap-modal-detailName">'+(ifo.name ? ifo.name : '')+(ifo.description ? ':' : '')+'</span><span class="ebap-modal-detailDesc">'+(ifo.description ? ifo.description : '')+'</li>')
        });
        return ('<ol class="ebap-modal-detailCon">'+_info.join('')+'</ol>')
    }
    /**
     * 说明:对miniui tabs组件的封装包括增加,删除，激活,更新tab,以及绑定事件等方法
     * @param  {string} tadId
     * @returns {undefined}
     */
    var ebapTabs = function(options) {
        var ebapTabsIns = ebapUtils.getInstance(options.id);
        var _tabs = ebapTabsIns.getTabs();
        var _names = [];
        var self = {
            addTab: function(tabCfg,ebapparams) {
                var _newEbapTab = tabCfg || {};
                var self = this;
                if(_names.indexOf(tabCfg.name)!== -1) {
                    var _activeTab = self.getTab(tabCfg.name);
                    self.activeTab(_activeTab);
                    return undefined;
                } else {
                    self._names.push(tabCfg.name);
                    tabCfg.ondestroy = function (e) {
                        var _ebapTabs = e.sender;
                        var _ebapIframe = _ebapTabs.getTabIFrameEl(e.tab);
                        var pageReturnData = _ebapIframe.contentWindow.getData ? _ebapIframe.contentWindow.getData() : "";
                    }
                    ebapTabsIns.addTab(_newBccTab);
                    self.activeTab(_newBccTab);
                    self.on('tabload',function(e) {
                        ebapparams = {};
                    });
                    return undefined;
                }
            },
            getActiveTab: function() {
                return ebapTabsIns.getActiveTab();
            },
            getTab: function(name) {
                var __name = name;
                if (__name) {
                    return  ebapTabsIns.getTab(__name)
                }
                return ebapTabsIns.getActiveTab();
            },
            updateTab: function(tab, tabCfg) {
                ebapTabsIns.updateTab(tab, tabCfg)
            },
            removeTab: function(name) {
                var _name = name;
                var _activeTab = _name ? self.getTab(_name) : self.getActiveTab();
                if (_activeTab) {
                    ebapTabsIns.removeTab(_activeTab);
                    self._names = self._names.splice(self._names.indexOf(_name),1);
                }
            },
            activeTab: function(name) {
                ebapTabsIns.activeTab(_tabInstance.getTab(name))
            },
            on: function(event,func) {
                ebapTabsIns.on(event,func);
            }
        }
        return self;
    };
    /*
     *  表单通用逻辑
     * */
    var ebapForm = function(options) {
        var ebapFormIns = ebapUtils.getInstance(options, 'form');
        var ebapFormUrl = '';
        var ebapFormData = null;
        this.ins = ebapFormIns;
        function _save() {
            ebapFormData = self.getData();
            var _treeSelect = ebapUtils.getInstance('parent-treeselect');
            ebapFormIns.validate();
            if (ebapFormIns.isValid() == false) return;
            ebapFormUrl = self.settings.saveUrl;
            ebapUtils.ajax({
                url: ebapFormUrl,
                type: 'post',
                data: ebapUtils.encode(ebapFormData),
                success: function (data, textStatus, jqXhr) {
                    ebapUtils.actions.close('save', ebapFormIns);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    ebapUtils.actions.close('', ebapFormIns);
                }
            });
        };
        var self = {
            getData: function(formatter, deep) {
                return ebapFormIns.getData(formatter, deep);
            },
            settings: {
                saveUrl: '',
                setUrl: ''
            },
            setData:function(data, all, deep) {
                ebapFormIns.setData(data, all, deep);
                if (data.action == "edit") {
                    data = miniSupport('clone')(data);
                    ebapFormUrl = self.settings.setUrl;
                    ebapUtils.ajax({
                        url: ebapFormUrl,
                        data: {id:data.id},
                        success: function (data, textStatus, jqXhr) {
                            ebapFormIns.setData(ebapUtils.decode(data));
                            ebapFormIns.setChanged(false);
                        }
                    });
                } else if (data.action == 'new') {
                    ebapFormIns.setData(data);
                }
            },
            onOk: function (e) {
                _save();
            },
            onCancel: function (e) {
                ebapUtils.actions.close('cancel');
            }
        };
        return  self;
    };
    /*
     *  列表通用逻辑
     * */
    var ebapList = function (options) {
        var showHidden = options.showHidden || [{ id: 1, text: '显示' }, { id: 0, text: '隐藏'}];
        var ebapTreeGridIns = ebapUtils.getInstance(options);
        var ebapSelectedRows = null;
        options.loadData && ebapTreeGridIns.reload();
        var self = {
            renderers: {
                onShowHidenRenderer: function (e){
                    for (var i = 0, l = showHidden.length; i < l; i++) {
                        var g = showHidden[i];
                        if (g.id == e.value) return g.text;
                    }
                    return "";
                },
                onActionRenderer: function () {}
            },
            settings: {
                editUrl: utils.prefixPath("/sys/menu/form"),
                addUrl: utils.prefixPath("/sys/menu/form"),
                delUrl: utils.prefixPath('/sys/menu/delete?id=')
            },
            onDrawCell: options.onDrawCell || function () {},
            add: function () {
                ebapSelectedRows = ebapTreeGridIns.getSelected();
                miniSupport('open')({
                    url: self.settings.addUrl ,
                    title: "新增菜单", width: 600, height: 400,
                    onload: function () {
                        var iframe = this.getIFrameEl();
                        var data = { action: "new",parentId: ebapSelectedRows.id };
                        iframe.contentWindow.ebapForm.setData(data);
                    },
                    ondestroy: function (action) {
                        ebapTreeGridIns.reload();
                    }
                });
            },
            search: function () {
                var _key = ebapUtils.getInstance('key').getValue();
                ebapTreeGridIns.load({ key: _key });
            },
            edit: function () {
                console.log('::::ebapSelectedRows', ebapSelectedRows);
                ebapSelectedRows = ebapTreeGridIns.getSelected();
                if (ebapSelectedRows) {
                    if (miniSupport('open')) {
                        miniSupport('open')({
                            url: self.settings.editUrl ,
                            title: "编辑菜单", width: 600, height: 400,
                            onload: function () {
                                var iframe = this.getIFrameEl();
                                var data = { action: "edit", id: ebapSelectedRows.id };
                                iframe.contentWindow.ebapForm.setData(data);
                            },
                            ondestroy: function (action) {
                                ebapTreeGridIns.reload();
                            }
                        });
                    }
                } else {
                    alert("请选中一条记录");
                }
            },
            remove: function () {
                ebapSelectedRows = ebapTreeGridIns.getSelecteds();
                if (ebapSelectedRows.length > 0) {
                    if (confirm("确定删除选中记录？")) {
                        var ids = [];
                        for (var i = 0, l = ebapSelectedRows.length; i < l; i++) {
                            var r = ebapSelectedRows[i];
                            ids.push(r.id);
                        }
                        var id = ids.join(',');
                        ebapTreeGridIns.loading("操作中，请稍后......");
                        utils.ajax({
                            url:self.settings.delUrl + id,
                            success: function (text) {
                                ebapTreeGridIns.reload();
                            },
                            error: function () {
                            }
                        });
                    }
                } else {
                    alert("请选中一条记录");
                }
            }
        };
        return self;
    };

    var builtInModules = builtInModules || {
            'form': ebapForm,
            'list': ebapList,
            'modal': ebapModal,
            'tabs': ebapTabs,
            'login': ebapLogin
        };
    for (var m in builtInModules) {
        ebapModules[m] = builtInModules[m] || function () {};
    }
    // 将模块注册进ebapBase
    function regesiter(moduleKey,module) {
        var __moduleKey = moduleKey;
        ebapModules[__moduleKey] = module;
    }
    // 获取模块实例
    function get(options) {
        var __moduleKey = options.key || '';
        var __moduleArr = [];
        var moduleLen = null;
        var moduleIns = null;
        var moduleDeps = {};
        var moduleSettings = null;
        var returnModuleIns = null;
        options.settings ? (moduleSettings = { settings: options.settings }) : (moduleSettings = {});
        $.each(moduleSettings.settings || {}, function(m, ms) {
            if (m.toLowerCase().slice(-3) === 'url') {
                moduleSettings[m] = utils.prefixPath(ms);
            }
        });
        function getModule(ns, ns_string) {
            var parts = ns_string.split('.');
            var parent = ns;
            var pl = parts.length;
            var exportModule = null;
            for (var i = 0; i < pl; i++) {
                if (!exportModule) {
                    exportModule = parent[parts[i]];
                } else {
                    exportModule = exportModule[parts[i]];
                }
            }
            return exportModule;
        }
        if (typeof __moduleKey == 'string') {
            moduleIns = getModule(ebapModules, __moduleKey);
            moduleDeps = utils.genDepsIns(options.deps);
            returnModuleIns = $.extend(moduleIns($.extend({},options,{ moduleDeps: moduleDeps})), { setUrls: utils.setUrls, extend: utils.extend, getIns: utils.getIns, insId: options.id, moduleType: options.key, moduleDeps: moduleDeps }, moduleSettings);
            if (options.name) {
                window[options.name] = returnModuleIns;
            }
            return returnModuleIns;
        } else if (toString.call(__moduleKey) === '[object Array]') {
            moduleLen = __moduleKey.length;
            for (var m = 0; m < moduleLen; m++) {
                if (__moduleKey[m] && typeof __moduleKey[m] === 'string') {
                    moduleIns = getModule(ebapModules, __moduleKey[m]);
                    moduleDeps = utils.genDepsIns(options.deps);
                    __moduleArr.push($.extend(moduleIns($.extend({},options,{ moduleDeps: moduleDeps})), { setUrls: utils.setUrls, extend: utils.extend, getIns: utils.getIns, insId: options.id, moduleType: options.key, moduleDeps: moduleDeps }, moduleSettings))
                }
            }
            return __moduleArr;
        }
    }
    function initGlobalEvent() {
        //所有ajax请求异常的统一处理函数，处理
        $(document).ajaxError(
            function (event, xhr, options, exc) {
                if (xhr.status == 'undefined') {
                    return;
                }
                // 后台返回的错误信息
                var errorJson = support('mini', 'decode')(xhr.responseText);
                if(errorJson && errorJson.ebaperror) {
                    var resJson = {
                        desc: errorJson.message,
                        detailInfo: [
                            {
                                name: errorJson.detail,
                                description: undefined
                            }
                        ]
                    }
                    var customModal = utils.get({
                        key: 'modal',
                        tplCfg: {
                            desc: resJson.desc,
                            detailInfo: resJson.detailInfo
                        },
                        selector: '.ebap-maskContainer',
                        context: document
                    });
                }
            }
        );
    }
    // ebapBase初始化，使用了单例,保证全局唯一
    (function init() {
        if(typeof ebapLogin === 'function') {
            var ebapLoginIns = ebapLogin({
                url: '/a/login'
            });
            ebapLoginIns.out();
        }
        initGlobalEvent();
        if(!ebapInstance) {
            ebapInstance = {
                regesiter: regesiter,
                utils: utils,
                get: get,
                setUp: setUp
            };
            if (miniSupport('parse') && !isParsed) {
                isParsed = true;
                miniSupport('parse')();
            }
        }
    })();
    return ebapInstance
})();

// 快捷方法

var ebapUtils = ebapBase.utils;

