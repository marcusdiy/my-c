/**
 * Usage example
 * MYC.register('test', { 
 *  registered: function() { alert('registered'); },
 *  connected: function(el) { el.innerHTML += new Date(); },
 *  styles: '.myc-test {font-size: 30px; color: red; background: #FFF}'
 * })
 * <my-c class="myc-test"></my-c> to use the test component
 */
if ("object" !== typeof MYC) MYC = {
    components: {},
    register: function (a, b) {
        MYC.components[a] = b;
    }
};

if (!MYC.components) MYC.components = {};
MYC.debug = !true;
MYC._instances = [];
MYC._waiting = [];
MYC._mode = 'es5';
MYC._lastid = 0;
MYC._domdata = {};

MYC.init = function () {

    if (window.customElements && typeof Reflect === 'object') {

        MYC._mode = 'es6';
        MYC.element = function () {
            return Reflect.construct(HTMLElement, [], this.constructor);
        };
        MYC.element.prototype = Object.create(HTMLElement.prototype);
        MYC.element.prototype.constructor = MYC.element;
        Object.setPrototypeOf(MYC.element, HTMLElement);
        MYC.element.prototype.connectedCallback = function () {
            MYC.connect(this);
        };
        MYC.element.prototype.disconnectedCallback = function () {
            MYC.disconnect(this);
        };
        customElements.define('my-c', MYC.element);

    } else {

        /* compatibility _mode */
        document.createElement('my-c');
        MYC.element = function () {
            return document.createElement('my-c');
        };
        (function ($) {
            $.fn.original_html = $.fn.html;
            $.fn.extend({
                html: function () {
                    setTimeout(MYC.activate, 10);
                    return $.fn.original_html.apply(this, arguments);
                }
            });
        })(jQuery);
    }

    MYC.activate();

};

/**
 * Register new component, prepend to file
 * if("object"!==typeof MYC)MYC={components:{},register:function(a,b){MYC.components[a]=b;}};
 * @param {*} id 
 * @param {*} funct : {
 *   styles: () { return 'body {opacity: 0}'; },
 *   connected: () {}, 
 *   disconnected: () {}, 
 *   registered: () {}
 * }
 */
MYC.register = function (id, options) {
    if (MYC.debug) console.log(':: myc register', id);
    var component = {};
    if (typeof options === 'object') {
        component = options;
    } else if (typeof options === 'function') {
        component.connected = options;
    }
    /* store component */
    MYC.components[id] = component;
    /* setup component */
    if (component.registered && typeof component.registered === 'function') {
        component.registered(function () {
            MYC.activate();
        });
    }
    /* load styles */
    if (component.styles) {
        var styles = '';
        var style = document.createElement('style');
        style.innerText = component.styles(styles);
        document.head.appendChild(style);
    }
    /* load waiting components */
    if (MYC._waiting && MYC._waiting[id]) {
        for (var widx = 0; widx < MYC._waiting[id].length; widx++) {
            if (document.body.contains(MYC._waiting[id][widx])) {
                MYC.connect(MYC._waiting[id][widx]);
            }
        }
        delete MYC._waiting[id];
    }
};

MYC.connect = function (el) {
    var component_id = el.getAttribute('class').split(' ')[0];
    if (MYC.debug) console.log(':: myc connect', component_id, el);
    /* prevent reconnecting: connected, connecting */
    if (el.MYC_STATUS === 'connected' || el.MYC_STATUS === 'connecting') return false;
    if (!el.MYC_CID) el.MYC_CID = component_id;
    if (!el.MYC_IDX) el.MYC_IDX = MYC.id();
    if (this.components[component_id]) {
        el.MYC_STATUS = 'connecting';
        var atts = {};
        for (atts = {}, ai = 0, atts_list = el.attributes, n = atts_list.length; ai < n; ai++) {
            atts[atts_list[ai].name] = atts_list[ai].value === "" ? true : atts_list[ai].value;
        }
        el.classList.add('myc-' + component_id + '');
        try {
            this.components[component_id].connected(el, atts);
            el.classList.add('connected');
        } catch (e) {
            console.warn('MYC Error', e);
        }
        /* MYC STATUS */
        el.MYC_STATUS = 'connected';
    } else {
        el.MYC_STATUS = 'waiting';
        if (!this._waiting[component_id]) this._waiting[component_id] = [];
        this._waiting[component_id].push(el);
    }
};

MYC.disconnect = function (el) {
    var component_id = el.MYC_CID;
    if (MYC.debug) console.log(':: myc disconnect', component_id, el);
    if (MYC.components[component_id] && MYC.components[component_id].disconnected) {
        MYC.components[component_id].disconnected(el);
    }
    MYC.data(el, null);
    MYC.unbind(el);
    var instance_id = el.MYC_IDX;
    delete MYC._instances[instance_id];
    MYC._instances.splice(instance_id, 1);
};

MYC.unbind = function (el) {
    if (el.replaceWith) {
        for (var prop in el) {
            el.prop = null;
        }
        el.replaceWith(null);
    } else {
        while (el.firstChild) {
            el.removeChild(el.firstChild);
        }
        el = null;
    }
};

MYC.activate_timer = false;

MYC.cleanup = function () {
    for (var idx in MYC._instances) {
        var el = MYC._instances[idx];
        if (!document.body.contains(el)) {
            MYC.disconnect(el);
        }
    }
    if (MYC.cleanup_timer) {
        clearTimeout(MYC.cleanup_timer);
    }
    MYC.cleanup_timer = setTimeout(MYC.cleanup, 30 * 1000);
};

MYC.activate = function (skip_timer) {
    if (MYC.activate_timer) clearTimeout(MYC.activate_timer);
    MYC.activate_timer = window.setTimeout(function () {
        MYC.real_activate();
        MYC.activate_timer = false;
        MYC.cleanup();
    }, 5);
};

MYC.real_activate = function (context) {
    var el, i, divs = [];
    if (context === undefined) context = document;
    divs = context.getElementsByTagName('my-c');
    for (i = 0; i < divs.length; i++) {
        if (divs[i].MYC_STATUS !== 'connected' || divs[i].MYC_STATUS !== 'connecting') {
            el = divs[i];
            MYC.connect(el);
        }
    }
    MYC.cleanup();
};

MYC.id = function () {
    return ++MYC._lastid;
};

MYC.data = function (el, key, value) {

    var id = el.MYC_IDX;
    /* assign dataid to div, which are not components */
    if (!id) el.MYC_IDX = id = MYC.id();

    if (MYC._domdata[id]) {
        if (el && key === null) {
            /* remove all data */
            MYC._domdata[id] = null;
            delete MYC._domdata[id];
        } else if (key === undefined) {
            /* return all data */
            return MYC._domdata[id];
        } else if (value === undefined) {
            /* return data */
            return MYC._domdata[id][key];
        } else {
            /* store data */
            if (!MYC._domdata[id]) MYC._domdata[id] = {};
            MYC._domdata[id][key] = value;
        }
    }
};

MYC.init();

MYC.register('test', {
    connected: function (el) {
        console.warn('Connected', el);
        el.innerHTML = new Date().getTime();
    },
    disconnected: function (el) {
        console.warn('Disconnected!', el);
        el.innerHTML = 'Disconnected!';
    }
});
