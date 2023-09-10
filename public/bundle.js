
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.ui = factory());
})(this, (function () { 'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    var RoutePages;
    (function (RoutePages) {
        RoutePages[RoutePages["Start"] = 0] = "Start";
        RoutePages[RoutePages["Pages"] = 1] = "Pages";
        RoutePages[RoutePages["DownloadList"] = 2] = "DownloadList";
    })(RoutePages || (RoutePages = {}));
    const createRoutes = () => {
        const { subscribe, update } = writable({
            pages: [
                'start',
                'pages',
                'downloadList',
            ],
            currentPage: RoutePages.Start,
            history: [],
        });
        const setNewIndex = (index) => {
            update((routes) => {
                routes.currentPage = index;
                routes.history.push(index);
                return routes;
            });
        };
        const goBack = () => {
            if (history.length) {
                update((routes) => {
                    routes.currentPage = routes.history.pop();
                    return routes;
                });
            }
        };
        return {
            subscribe,
            setPage: (index) => setNewIndex(index),
            back: () => goBack()
        };
    };
    const routes = createRoutes();

    /* src/components/Route.svelte generated by Svelte v3.44.2 */

    function create_if_block(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[2],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[2])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function create_fragment$d(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*$routes*/ ctx[1].currentPage === /*page*/ ctx[0] && create_if_block(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*$routes*/ ctx[1].currentPage === /*page*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*$routes, page*/ 3) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let $routes;
    	component_subscribe($$self, routes, $$value => $$invalidate(1, $routes = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { page } = $$props;

    	$$self.$$set = $$props => {
    		if ('page' in $$props) $$invalidate(0, page = $$props.page);
    		if ('$$scope' in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	return [page, $routes, $$scope, slots];
    }

    class Route extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$c, create_fragment$d, safe_not_equal, { page: 0 });
    	}
    }

    function styleInject(css, ref) {
      if ( ref === void 0 ) ref = {};
      var insertAt = ref.insertAt;

      if (!css || typeof document === 'undefined') { return; }

      var head = document.head || document.getElementsByTagName('head')[0];
      var style = document.createElement('style');
      style.type = 'text/css';

      if (insertAt === 'top') {
        if (head.firstChild) {
          head.insertBefore(style, head.firstChild);
        } else {
          head.appendChild(style);
        }
      } else {
        head.appendChild(style);
      }

      if (style.styleSheet) {
        style.styleSheet.cssText = css;
      } else {
        style.appendChild(document.createTextNode(css));
      }
    }

    var css_248z$d = ".checkbox.svelte-1ksdj2h.svelte-1ksdj2h.svelte-1ksdj2h{align-items:center;break-inside:avoid;cursor:default;display:flex;height:var(--size-medium);position:relative}.checkbox.svelte-1ksdj2h input.svelte-1ksdj2h.svelte-1ksdj2h{opacity:0;width:10px;height:10px;margin:0;padding:0}.checkbox.svelte-1ksdj2h label.svelte-1ksdj2h.svelte-1ksdj2h{align-items:center;border:1px solid transparent;display:flex;font-size:var(--font-size-xsmall);margin-left:-16px;padding:0 var(--size-xsmall) 0 var(--size-xsmall);height:100%;user-select:none;width:100%}.checkbox.svelte-1ksdj2h label.svelte-1ksdj2h.svelte-1ksdj2h:hover{background-color:var(--figma-color-bg-hover)}.checkbox.svelte-1ksdj2h label.svelte-1ksdj2h.svelte-1ksdj2h:before{border:1px solid var(--figma-color-icon);border-radius:var(--border-radius-small);content:'';display:block;width:10px;height:10px;margin:-1px 10px 0 -8px;box-shadow:none}.checkbox.svelte-1ksdj2h input.svelte-1ksdj2h:disabled+label.svelte-1ksdj2h{color:var(--figma-color-icon-disabled);opacity:0.3}.checkbox.svelte-1ksdj2h input.svelte-1ksdj2h:checked+label.svelte-1ksdj2h:before{background-color:var(--figma-color-bg-brand);background-image:url('data:image/svg+xml;utf8,%3Csvg%20fill%3D%22none%22%20height%3D%227%22%20viewBox%3D%220%200%208%207%22%20width%3D%228%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20clip-rule%3D%22evenodd%22%20d%3D%22m1.17647%201.88236%201.88235%201.88236%203.76471-3.76472%201.17647%201.17648-4.94118%204.9412-3.05882-3.05884z%22%20fill%3D%22%23fff%22%20fill-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E');background-repeat:no-repeat;background-position:1px 2px;border:1px solid var(--figma-color-bg-brand)}.checkbox.svelte-1ksdj2h input.svelte-1ksdj2h:checked:disabled+label.svelte-1ksdj2h:before{border:1px solid transparent;background-color:var(--figma-color-icon-disabled)}";
    styleInject(css_248z$d);

    /* src/components/Checkbox.svelte generated by Svelte v3.44.2 */

    function create_fragment$c(ctx) {
    	let section;
    	let input;
    	let t;
    	let label;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

    	return {
    		c() {
    			section = element("section");
    			input = element("input");
    			t = space();
    			label = element("label");
    			if (default_slot) default_slot.c();
    			input.value = /*value*/ ctx[0];
    			attr(input, "name", /*name*/ ctx[1]);
    			attr(input, "id", /*id*/ ctx[2]);
    			attr(input, "type", "checkbox");
    			input.checked = /*selected*/ ctx[3];
    			attr(input, "class", "svelte-1ksdj2h");
    			attr(label, "for", /*id*/ ctx[2]);
    			attr(label, "class", "svelte-1ksdj2h");
    			attr(section, "class", "checkbox svelte-1ksdj2h");
    		},
    		m(target, anchor) {
    			insert(target, section, anchor);
    			append(section, input);
    			append(section, t);
    			append(section, label);

    			if (default_slot) {
    				default_slot.m(label, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen(input, "change", /*handleChange*/ ctx[4]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (!current || dirty & /*value*/ 1) {
    				input.value = /*value*/ ctx[0];
    			}

    			if (!current || dirty & /*name*/ 2) {
    				attr(input, "name", /*name*/ ctx[1]);
    			}

    			if (!current || dirty & /*id*/ 4) {
    				attr(input, "id", /*id*/ ctx[2]);
    			}

    			if (!current || dirty & /*selected*/ 8) {
    				input.checked = /*selected*/ ctx[3];
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 32)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[5],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[5])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*id*/ 4) {
    				attr(label, "for", /*id*/ ctx[2]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(section);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { value } = $$props;
    	let { name } = $$props;
    	let { id } = $$props;
    	let { selected = false } = $$props;
    	const dispatch = createEventDispatcher();

    	const handleChange = () => {
    		dispatch('change', { value: id });
    	};

    	$$self.$$set = $$props => {
    		if ('value' in $$props) $$invalidate(0, value = $$props.value);
    		if ('name' in $$props) $$invalidate(1, name = $$props.name);
    		if ('id' in $$props) $$invalidate(2, id = $$props.id);
    		if ('selected' in $$props) $$invalidate(3, selected = $$props.selected);
    		if ('$$scope' in $$props) $$invalidate(5, $$scope = $$props.$$scope);
    	};

    	return [value, name, id, selected, handleChange, $$scope, slots];
    }

    class Checkbox extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$b, create_fragment$c, safe_not_equal, { value: 0, name: 1, id: 2, selected: 3 });
    	}
    }

    var css_248z$c = "button.svelte-1mcaqun{align-items:center;background-color:var(--figma-color-bg-brand);border:1px solid transparent;border-radius:5px;color:var(--figma-color-text-onbrand);display:inline-flex;font-size:var(--font-size-xsmall);font-weight:500;height:var(--size-medium);justify-content:center;min-width:8rem;padding:0 1.5rem}button.svelte-1mcaqun:disabled{background-color:var(--figma-color-bg-disabled);color:var(--figma-color-text-ondisabled)}";
    styleInject(css_248z$c);

    /* src/components/Button.svelte generated by Svelte v3.44.2 */

    function create_fragment$b(ctx) {
    	let button;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	return {
    		c() {
    			button = element("button");
    			if (default_slot) default_slot.c();
    			attr(button, "class", "button svelte-1mcaqun");
    			button.disabled = /*disabled*/ ctx[1];
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);

    			if (default_slot) {
    				default_slot.m(button, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen(button, "click", function () {
    					if (is_function(/*onClick*/ ctx[0])) /*onClick*/ ctx[0].apply(this, arguments);
    				});

    				mounted = true;
    			}
    		},
    		p(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[2],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[2])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*disabled*/ 2) {
    				button.disabled = /*disabled*/ ctx[1];
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { onClick = () => alert('Life has never Svelte better') } = $$props;
    	let { disabled = false } = $$props;

    	$$self.$$set = $$props => {
    		if ('onClick' in $$props) $$invalidate(0, onClick = $$props.onClick);
    		if ('disabled' in $$props) $$invalidate(1, disabled = $$props.disabled);
    		if ('$$scope' in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	return [onClick, disabled, $$scope, slots];
    }

    class Button extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$a, create_fragment$b, safe_not_equal, { onClick: 0, disabled: 1 });
    	}
    }

    var css_248z$b = "footer.svelte-jeh6i3{display:flex;justify-content:flex-end;gap:1rem;padding:1rem}";
    styleInject(css_248z$b);

    /* src/components/ButtonFooter.svelte generated by Svelte v3.44.2 */

    function create_fragment$a(ctx) {
    	let footer;
    	let footer_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	return {
    		c() {
    			footer = element("footer");
    			if (default_slot) default_slot.c();
    			attr(footer, "class", footer_class_value = "footer " + /*className*/ ctx[0] + " svelte-jeh6i3");
    		},
    		m(target, anchor) {
    			insert(target, footer, anchor);

    			if (default_slot) {
    				default_slot.m(footer, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[1],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*className*/ 1 && footer_class_value !== (footer_class_value = "footer " + /*className*/ ctx[0] + " svelte-jeh6i3")) {
    				attr(footer, "class", footer_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(footer);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: className = '' } = $$props;

    	$$self.$$set = $$props => {
    		if ('class' in $$props) $$invalidate(0, className = $$props.class);
    		if ('$$scope' in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	return [className, $$scope, slots];
    }

    class ButtonFooter extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$9, create_fragment$a, safe_not_equal, { class: 0 });
    	}
    }

    var css_248z$a = "section.svelte-14yhxig{display:grid;grid-template-columns:2fr 1fr;grid-template-rows:auto 1fr auto;grid-template-areas:\"header explanation\"\n      \"pages explanation\"\n      \"footer explanation\";height:100%}section.svelte-14yhxig > .title{grid-area:header;padding:1rem 1rem 0}section.svelte-14yhxig > .content{grid-area:pages;overflow:scroll}section.svelte-14yhxig > .sidebar{grid-area:explanation}section.svelte-14yhxig > .footer{grid-area:footer}";
    styleInject(css_248z$a);

    /* src/components/PageLayout.svelte generated by Svelte v3.44.2 */

    function create_fragment$9(ctx) {
    	let section;
    	let section_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	return {
    		c() {
    			section = element("section");
    			if (default_slot) default_slot.c();
    			attr(section, "class", section_class_value = "" + (null_to_empty(/*className*/ ctx[0]) + " svelte-14yhxig"));
    		},
    		m(target, anchor) {
    			insert(target, section, anchor);

    			if (default_slot) {
    				default_slot.m(section, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[1],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*className*/ 1 && section_class_value !== (section_class_value = "" + (null_to_empty(/*className*/ ctx[0]) + " svelte-14yhxig"))) {
    				attr(section, "class", section_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(section);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: className = '' } = $$props;

    	$$self.$$set = $$props => {
    		if ('class' in $$props) $$invalidate(0, className = $$props.class);
    		if ('$$scope' in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	return [className, $$scope, slots];
    }

    class PageLayout extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$8, create_fragment$9, safe_not_equal, { class: 0 });
    	}
    }

    var css_248z$9 = "aside.svelte-jl3i6x{border-left:1px solid var(--figma-color-border);grid-area:explanation;padding:.5rem 1rem}";
    styleInject(css_248z$9);

    /* src/components/Sidebar.svelte generated by Svelte v3.44.2 */

    function create_fragment$8(ctx) {
    	let aside;
    	let aside_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	return {
    		c() {
    			aside = element("aside");
    			if (default_slot) default_slot.c();
    			attr(aside, "class", aside_class_value = "sidebar " + /*className*/ ctx[0] + " svelte-jl3i6x");
    		},
    		m(target, anchor) {
    			insert(target, aside, anchor);

    			if (default_slot) {
    				default_slot.m(aside, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[1],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*className*/ 1 && aside_class_value !== (aside_class_value = "sidebar " + /*className*/ ctx[0] + " svelte-jl3i6x")) {
    				attr(aside, "class", aside_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(aside);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: className = '' } = $$props;

    	$$self.$$set = $$props => {
    		if ('class' in $$props) $$invalidate(0, className = $$props.class);
    		if ('$$scope' in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	return [className, $$scope, slots];
    }

    class Sidebar extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$7, create_fragment$8, safe_not_equal, { class: 0 });
    	}
    }

    var css_248z$8 = "section.svelte-5oio2f{padding:1rem}section.columns.svelte-5oio2f{columns:2}";
    styleInject(css_248z$8);

    /* src/components/Content.svelte generated by Svelte v3.44.2 */

    function create_fragment$7(ctx) {
    	let section;
    	let section_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	return {
    		c() {
    			section = element("section");
    			if (default_slot) default_slot.c();
    			attr(section, "class", section_class_value = "content " + /*className*/ ctx[0] + " svelte-5oio2f");
    		},
    		m(target, anchor) {
    			insert(target, section, anchor);

    			if (default_slot) {
    				default_slot.m(section, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[1],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*className*/ 1 && section_class_value !== (section_class_value = "content " + /*className*/ ctx[0] + " svelte-5oio2f")) {
    				attr(section, "class", section_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(section);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: className = '' } = $$props;

    	$$self.$$set = $$props => {
    		if ('class' in $$props) $$invalidate(0, className = $$props.class);
    		if ('$$scope' in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	return [className, $$scope, slots];
    }

    class Content extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$6, create_fragment$7, safe_not_equal, { class: 0 });
    	}
    }

    var MessageTypes;
    (function (MessageTypes) {
        MessageTypes["GetPages"] = "getPages";
        MessageTypes["Pages"] = "sendPages";
        MessageTypes["DownloadList"] = "downloadList";
        MessageTypes["DownloadData"] = "downloadData";
        MessageTypes["PrepareExport"] = "prepareExport";
        MessageTypes["CreateDownload"] = "createDownload";
        MessageTypes["DownloadMessage"] = "downloadMessage";
    })(MessageTypes || (MessageTypes = {}));

    const createPages = () => {
        const { subscribe, set } = writable([]);
        const getPages = () => {
            parent.postMessage({
                pluginMessage: {
                    type: MessageTypes.GetPages,
                    data: null,
                },
            }, '*');
        };
        return {
            subscribe,
            setPages: (pages) => set(pages),
            getPages
        };
    };
    const pages = createPages();

    const createExportPageIds = () => {
        const { subscribe, set, update } = writable([]);
        const togglePage = (page) => {
            update((pages) => {
                if (pages.includes(page)) {
                    const index = pages.findIndex((id) => id === page);
                    pages.splice(index, 1);
                }
                else {
                    pages.push(page);
                }
                return pages;
            });
        };
        const clearSelection = () => {
            update(() => []);
        };
        return {
            subscribe,
            setExportPageIds: (exportPages) => set(exportPages),
            togglePage,
            clearSelection,
        };
    };
    const exportPageIds = createExportPageIds();

    var css_248z$7 = "header.svelte-1hi16pn{align-items:center;display:flex;font-size:var(--font-size-xsmall);font-weight:var(--font-weight-bold);line-height:1;padding:1rem 0}";
    styleInject(css_248z$7);

    /* src/components/Title.svelte generated by Svelte v3.44.2 */

    function create_fragment$6(ctx) {
    	let header;
    	let header_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	return {
    		c() {
    			header = element("header");
    			if (default_slot) default_slot.c();
    			attr(header, "class", header_class_value = "title " + /*className*/ ctx[0] + " svelte-1hi16pn");
    		},
    		m(target, anchor) {
    			insert(target, header, anchor);

    			if (default_slot) {
    				default_slot.m(header, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[1],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*className*/ 1 && header_class_value !== (header_class_value = "title " + /*className*/ ctx[0] + " svelte-1hi16pn")) {
    				attr(header, "class", header_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(header);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: className = '' } = $$props;

    	$$self.$$set = $$props => {
    		if ('class' in $$props) $$invalidate(0, className = $$props.class);
    		if ('$$scope' in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	return [className, $$scope, slots];
    }

    class Title extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$5, create_fragment$6, safe_not_equal, { class: 0 });
    	}
    }

    var css_248z$6 = ":root {\n\t/* COLORS */\n\n    /* Accent */\n    --blue: #18a0fb; \n    --purple: #7b61ff; \n    --hot-pink: #ff00ff;\n    --green: #1bc47d;\n    --red: #f24822;\n    --yellow: #ffeb00;\n\n    /* Basic foreground */\n    --black: #000000;\n    --black8: rgba(0, 0, 0, .8); \n    --black8-opaque: #333333; \n    --black3: rgba(0, 0, 0, .3);\n    --black3-opaque: #B3B3B3; \n    --white: #ffffff; \n    --white8: rgba(255, 255, 255, .8); \n    --white4: rgba(255, 255, 255, .4); \n\n    /* Basic background */\n    --grey: #f0f0f0; \n    --silver: #e5e5e5; \n    --hud: #222222;\n    --toolbar: #2c2c2c;\n\n    /* Special */\n    --black1: rgba(0, 0, 0, .1); \n    --blue3: rgba(24, 145, 251, .3); \n    --purple4: rgba(123, 97, 255, .4);\n    --hover-fill: rgba(0, 0, 0, .06);\n    --selection-a: #daebf7;\n    --selection-b: #edf5fa;\n    --white2: rgba(255, 255, 255, .2); \n\n\n    /* TYPOGRAPHY */\n    /* Pos = positive applications (black on white) */\n    /* Neg = negative applications (white on black) */\n    \n    /* Font stack */\n    --font-stack: 'Inter', sans-serif;\n\n    /* Font sizes */\n    --font-size-xsmall: 11px;\n    --font-size-small: 12px;\n    --font-size-large: 13px;\n    --font-size-xlarge: 14px;\n\n    /* Font weights */\n    --font-weight-normal: 400;\n    --font-weight-medium: 500;\n    --font-weight-bold: 600;\n\n    /* Lineheight */\n    --font-line-height: 16px; /* Use For xsmall, small font sizes */\n    --font-line-height-large: 24px; /* Use For large, xlarge font sizes */\n    \n    /* Letterspacing */\n    --font-letter-spacing-pos-xsmall: .005em;\n    --font-letter-spacing-neg-xsmall: .01em;\n    --font-letter-spacing-pos-small: 0;\n    --font-letter-spacing-neg-small: .005em;\n    --font-letter-spacing-pos-large: -.0025em;\n    --font-letter-spacing-neg-large: .0025em;\n    --font-letter-spacing-pos-xlarge: -.001em;\n    --font-letter-spacing-neg-xlarge: -.001em;\n\n\n    /* BORDER RADIUS */\n    --border-radius-small: 2px;\n    --border-radius-med: 5px;\n    --border-radius-large: 6px;\n\n\n    /* SHADOWS */\n    --shadow-hud: 0 5px 17px rgba(0, 0, 0, .2), 0 2px 7px rgba(0, 0, 0, .15);\n    --shadow-floating-window: 0 2px 14px rgba(0, 0, 0, .15);\n\n\n    /* SPACING + SIZING */\n    --size-xxxsmall: 4px;\n    --size-xxsmall: 8px;\n    --size-xsmall: 16px;\n    --size-small: 24px;\n    --size-medium: 32px;\n    --size-large: 40px;\n    --size-xlarge: 48px;\n    --size-xxlarge: 64px;\n    --size-xxxlarge: 80px;\n}\n\n/* Global styles */\n\n* {\n\tbox-sizing: border-box;\n}\n\nbody {\n  color: var(--figma-color-text);\n  position: relative;\n\tbox-sizing: border-box;\n  font-family: 'Inter', sans-serif;\n  font-size: var(--font-size-xsmall);\n  margin: 0;\n  padding: 0;\n}\n\nol {\n  padding-left: 1.5rem;\n}\n\nli {\n  margin-bottom: .75rem;\n}\n\nol > li::marker {\n  font-weight: bold;\n}\n\na {\n  color: var(--figma-color-text-brand);\n}\n";
    styleInject(css_248z$6);

    var css_248z$5 = ".pages-page .sidebar{background-repeat:no-repeat;background-position:bottom 1rem center;background-size:80%;background-image:url(\"data:image/svg+xml,%3Csvg viewBox='0 0 579 702' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M57.3896 702C47.5677 702.016 37.9826 696.641 29.9433 686.61C21.9041 676.579 15.8027 662.381 12.4727 645.955C-2.15805 573.501 -15.0481 439.286 42.2357 294.113C105.576 133.593 159.527 21.1017 248.654 4.10636C388.276 -22.5156 403.496 210.591 462.737 287.061C514.573 353.97 568.515 426.204 578.76 608.559C579.428 620.367 578.696 632.294 576.612 643.568C574.529 654.843 571.139 665.217 566.662 674.02C562.184 682.824 556.719 689.862 550.618 694.681C544.517 699.499 537.916 701.992 531.24 701.998L57.3896 702Z' fill='%23F3F5FD'/%3E%3Cpath d='M158.369 47.9V64H84.5319C76.7075 64.0003 69.2035 67.1082 63.6701 72.6402C58.1367 78.1723 55.027 85.6756 55.0249 93.5V621.508C55.0249 629.334 58.1337 636.839 63.6673 642.373C69.2009 647.906 76.7062 651.015 84.5319 651.015H478.72C482.595 651.016 486.432 650.253 490.013 648.771C493.593 647.288 496.846 645.115 499.587 642.375C502.327 639.634 504.5 636.381 505.983 632.801C507.465 629.221 508.228 625.383 508.227 621.508V93.5C508.225 85.6754 505.116 78.1718 499.582 72.6396C494.049 67.1075 486.544 63.9997 478.72 64H404.882V47.9C404.883 45.1704 404.346 42.4674 403.301 39.9454C402.257 37.4234 400.727 35.1317 398.797 33.2013C396.867 31.2709 394.576 29.7396 392.054 28.6948C389.532 27.65 386.829 27.1121 384.1 27.112H179.152C176.422 27.1121 173.719 27.65 171.198 28.6948C168.676 29.7396 166.385 31.2709 164.455 33.2013C162.525 35.1316 160.994 37.4233 159.95 39.9453C158.906 42.4673 158.368 45.1704 158.369 47.9V47.9Z' fill='%23C1D8ED'/%3E%3Cpath d='M82.3149 101.876L82.3149 613.133C82.3149 620.468 88.261 626.414 95.5959 626.414H467.654C474.989 626.414 480.935 620.468 480.935 613.133L480.935 101.876C480.935 94.5411 474.989 88.595 467.654 88.595H95.5959C88.261 88.595 82.3149 94.5411 82.3149 101.876Z' fill='%23FAFAFA'/%3E%3Cpath d='M184.807 64.892V112.3C184.807 117.287 188.85 121.33 193.837 121.33L369.415 121.33C374.402 121.33 378.445 117.287 378.445 112.3V64.892C378.445 59.9049 374.402 55.862 369.415 55.862L193.837 55.862C188.85 55.862 184.807 59.9049 184.807 64.892Z' fill='%230CBC8B'/%3E%3Cpath d='M177.821 353.505H126.4C121.168 353.499 116.151 351.418 112.452 347.718C108.752 344.019 106.671 339.002 106.665 333.77V282.352C106.671 277.12 108.752 272.103 112.452 268.404C116.151 264.704 121.168 262.623 126.4 262.617H177.818C183.05 262.623 188.067 264.704 191.766 268.404C195.466 272.103 197.547 277.12 197.553 282.352V333.77C197.547 339.002 195.467 344.018 191.767 347.717C188.068 351.417 183.053 353.498 177.821 353.505ZM126.4 272.617C123.819 272.62 121.345 273.646 119.52 275.472C117.695 277.297 116.668 279.771 116.665 282.352V333.77C116.668 336.351 117.695 338.825 119.52 340.65C121.345 342.476 123.819 343.502 126.4 343.505H177.818C180.399 343.502 182.873 342.476 184.698 340.65C186.524 338.825 187.55 336.351 187.553 333.77V282.352C187.55 279.771 186.524 277.297 184.698 275.472C182.873 273.646 180.399 272.62 177.818 272.617H126.4Z' fill='%23DEE8F5'/%3E%3Cpath d='M177.156 237.888H125.735C120.503 237.882 115.486 235.801 111.787 232.101C108.087 228.402 106.006 223.385 106 218.153V166.735C106.006 161.503 108.087 156.486 111.787 152.787C115.486 149.087 120.503 147.006 125.735 147H177.153C182.385 147.006 187.402 149.087 191.101 152.787C194.801 156.486 196.882 161.503 196.888 166.735V218.153C196.882 223.385 194.802 228.401 191.102 232.1C187.403 235.8 182.388 237.881 177.156 237.888ZM125.735 157C123.154 157.003 120.68 158.029 118.855 159.855C117.029 161.68 116.003 164.154 116 166.735V218.153C116.003 220.734 117.029 223.208 118.855 225.033C120.68 226.859 123.154 227.885 125.735 227.888H177.153C179.734 227.885 182.208 226.859 184.033 225.033C185.858 223.208 186.885 220.734 186.888 218.153V166.735C186.885 164.154 185.858 161.68 184.033 159.855C182.208 158.029 179.734 157.003 177.153 157H125.735Z' fill='%23DEE8F5'/%3E%3Cpath d='M177.821 469H126.4C121.168 468.994 116.151 466.913 112.452 463.213C108.752 459.514 106.671 454.497 106.665 449.265V397.851C106.671 392.619 108.752 387.602 112.452 383.903C116.151 380.203 121.168 378.122 126.4 378.116H177.818C183.05 378.122 188.067 380.203 191.766 383.903C195.466 387.602 197.547 392.619 197.553 397.851V449.269C197.546 454.5 195.465 459.515 191.766 463.214C188.067 466.913 183.052 468.993 177.821 469V469ZM126.4 388.116C123.819 388.119 121.345 389.145 119.52 390.971C117.695 392.796 116.668 395.27 116.665 397.851V449.269C116.669 451.849 117.696 454.323 119.521 456.147C121.346 457.971 123.82 458.997 126.4 459H177.818C180.399 458.997 182.873 457.971 184.698 456.145C186.524 454.32 187.55 451.846 187.553 449.265V397.851C187.55 395.27 186.524 392.796 184.698 390.971C182.873 389.145 180.399 388.119 177.818 388.116H126.4Z' fill='%23DEE8F5'/%3E%3Cpath d='M177.821 584.5H126.4C121.168 584.494 116.151 582.413 112.452 578.713C108.752 575.013 106.671 569.996 106.665 564.764V513.35C106.671 508.118 108.752 503.101 112.452 499.402C116.151 495.702 121.168 493.621 126.4 493.615H177.818C183.05 493.621 188.067 495.702 191.766 499.402C195.466 503.101 197.547 508.118 197.553 513.35V564.768C197.546 569.999 195.465 575.014 191.766 578.713C188.067 582.412 183.052 584.493 177.821 584.5V584.5ZM126.4 503.615C123.819 503.618 121.345 504.645 119.52 506.47C117.695 508.295 116.668 510.769 116.665 513.35V564.768C116.669 567.348 117.696 569.822 119.521 571.646C121.346 573.471 123.82 574.497 126.4 574.5H177.818C180.399 574.497 182.874 573.47 184.699 571.645C186.524 569.82 187.55 567.345 187.553 564.764V513.35C187.55 510.769 186.524 508.295 184.698 506.47C182.873 504.645 180.399 503.618 177.818 503.615H126.4Z' fill='%23DEE8F5'/%3E%3Cpath d='M141.39 327.9C140.748 327.901 140.114 327.765 139.529 327.501C138.944 327.236 138.423 326.85 138 326.367L122.74 308.92C121.991 308.017 121.624 306.857 121.718 305.687C121.811 304.517 122.358 303.43 123.242 302.658C124.126 301.886 125.276 301.489 126.448 301.553C127.62 301.617 128.72 302.136 129.515 303L141.878 317.134L175.21 289.271C175.66 288.871 176.186 288.565 176.757 288.372C177.327 288.178 177.931 288.102 178.531 288.146C179.132 288.19 179.718 288.355 180.254 288.63C180.79 288.905 181.265 289.284 181.652 289.746C182.038 290.208 182.328 290.743 182.504 291.32C182.68 291.896 182.738 292.501 182.676 293.1C182.614 293.7 182.431 294.28 182.14 294.808C181.849 295.335 181.455 295.799 180.982 296.171L144.275 326.857C143.466 327.533 142.444 327.902 141.39 327.9V327.9Z' fill='%23FD5D76'/%3E%3Cpath d='M140.725 212.283C140.083 212.284 139.449 212.148 138.864 211.884C138.279 211.619 137.758 211.233 137.335 210.75L122.075 193.303C121.326 192.4 120.959 191.24 121.053 190.07C121.146 188.9 121.693 187.813 122.577 187.041C123.461 186.269 124.611 185.872 125.783 185.936C126.955 186 128.055 186.519 128.85 187.383L141.213 201.517L174.545 173.654C174.995 173.254 175.521 172.948 176.092 172.755C176.662 172.561 177.266 172.485 177.866 172.529C178.467 172.573 179.053 172.738 179.589 173.013C180.125 173.288 180.6 173.667 180.987 174.129C181.373 174.591 181.663 175.126 181.839 175.703C182.015 176.279 182.073 176.884 182.011 177.483C181.948 178.083 181.766 178.663 181.475 179.191C181.184 179.718 180.79 180.182 180.317 180.554L143.61 211.24C142.801 211.916 141.779 212.285 140.725 212.283V212.283Z' fill='%23FD5D76'/%3E%3Cpath d='M141.39 558.9C140.748 558.901 140.113 558.765 139.528 558.5C138.944 558.235 138.422 557.848 138 557.365L122.74 539.919C122.351 539.474 122.053 538.957 121.864 538.397C121.675 537.837 121.598 537.246 121.637 536.656C121.676 536.066 121.832 535.49 122.094 534.96C122.356 534.431 122.72 533.958 123.164 533.568C123.609 533.179 124.126 532.882 124.686 532.692C125.246 532.503 125.838 532.426 126.428 532.466C127.017 532.505 127.593 532.66 128.123 532.922C128.653 533.184 129.126 533.548 129.515 533.993L141.878 548.128L175.21 520.264C175.66 519.864 176.186 519.558 176.757 519.365C177.327 519.171 177.931 519.095 178.531 519.139C179.132 519.183 179.718 519.348 180.254 519.623C180.79 519.898 181.265 520.277 181.652 520.739C182.038 521.201 182.328 521.736 182.504 522.313C182.68 522.889 182.738 523.494 182.676 524.093C182.614 524.693 182.431 525.273 182.14 525.801C181.849 526.328 181.455 526.792 180.982 527.164L144.275 557.849C143.467 558.528 142.445 558.9 141.39 558.9V558.9Z' fill='%23FD5D76'/%3E%3Cg opacity='0.62'%3E%3Cpath opacity='0.62' d='M225.372 302.068C222.062 302.068 219.378 304.751 219.378 308.062C219.378 311.372 222.062 314.055 225.372 314.055H450.439C453.749 314.055 456.433 311.372 456.433 308.062C456.433 304.751 453.749 302.068 450.439 302.068H225.372Z' fill='%23DEE8F5'/%3E%3Cpath opacity='0.62' d='M225.371 265.326C222.061 265.326 219.377 268.009 219.377 271.32C219.377 274.63 222.061 277.313 225.371 277.313H450.438C453.748 277.313 456.432 274.63 456.432 271.32C456.432 268.009 453.748 265.326 450.438 265.326H225.371Z' fill='%23DEE8F5'/%3E%3Cpath opacity='0.62' d='M225.371 338.81C222.061 338.81 219.377 341.493 219.377 344.804C219.377 348.114 222.061 350.797 225.371 350.797H400.438C403.748 350.797 406.432 348.114 406.432 344.804C406.432 341.493 403.748 338.81 400.438 338.81H225.371Z' fill='%23DEE8F5'/%3E%3C/g%3E%3Cg opacity='0.62'%3E%3Cpath opacity='0.62' d='M224.707 186.451C221.396 186.451 218.713 189.134 218.713 192.445C218.713 195.755 221.396 198.438 224.707 198.438H449.774C453.084 198.438 455.768 195.755 455.768 192.445C455.768 189.134 453.084 186.451 449.774 186.451H224.707Z' fill='%23DEE8F5'/%3E%3Cpath opacity='0.62' d='M224.706 149.709C221.396 149.709 218.712 152.392 218.712 155.703C218.712 159.013 221.396 161.696 224.706 161.696H449.773C453.083 161.696 455.767 159.013 455.767 155.703C455.767 152.392 453.083 149.709 449.773 149.709H224.706Z' fill='%23DEE8F5'/%3E%3Cpath opacity='0.62' d='M224.706 223.193C221.396 223.193 218.712 225.876 218.712 229.187C218.712 232.497 221.396 235.18 224.706 235.18H399.773C403.083 235.18 405.767 232.497 405.767 229.187C405.767 225.876 403.083 223.193 399.773 223.193H224.706Z' fill='%23DEE8F5'/%3E%3C/g%3E%3Cg opacity='0.62'%3E%3Cpath opacity='0.62' d='M225.372 417.567C222.062 417.567 219.378 420.25 219.378 423.561C219.378 426.871 222.062 429.554 225.372 429.554H450.439C453.749 429.554 456.433 426.871 456.433 423.561C456.433 420.25 453.749 417.567 450.439 417.567H225.372Z' fill='%23DEE8F5'/%3E%3Cpath opacity='0.62' d='M225.371 380.825C222.061 380.825 219.377 383.508 219.377 386.819C219.377 390.129 222.061 392.812 225.371 392.812H450.438C453.748 392.812 456.432 390.129 456.432 386.819C456.432 383.508 453.748 380.825 450.438 380.825H225.371Z' fill='%23DEE8F5'/%3E%3Cpath opacity='0.62' d='M225.371 454.309C222.061 454.309 219.377 456.992 219.377 460.303C219.377 463.613 222.061 466.296 225.371 466.296H400.438C403.748 466.296 406.432 463.613 406.432 460.303C406.432 456.992 403.748 454.309 400.438 454.309H225.371Z' fill='%23DEE8F5'/%3E%3C/g%3E%3Cg opacity='0.62'%3E%3Cpath opacity='0.62' d='M225.372 533.066C222.062 533.066 219.378 535.749 219.378 539.06C219.378 542.37 222.062 545.053 225.372 545.053H450.439C453.749 545.053 456.433 542.37 456.433 539.06C456.433 535.749 453.749 533.066 450.439 533.066H225.372Z' fill='%23DEE8F5'/%3E%3Cpath opacity='0.62' d='M225.371 496.324C222.061 496.324 219.377 499.007 219.377 502.318C219.377 505.628 222.061 508.311 225.371 508.311H450.438C453.748 508.311 456.432 505.628 456.432 502.318C456.432 499.007 453.748 496.324 450.438 496.324H225.371Z' fill='%23DEE8F5'/%3E%3Cpath opacity='0.62' d='M225.371 569.808C222.061 569.808 219.377 572.491 219.377 575.802C219.377 579.112 222.061 581.795 225.371 581.795H400.438C403.748 581.795 406.432 579.112 406.432 575.802C406.432 572.491 403.748 569.808 400.438 569.808H225.371Z' fill='%23DEE8F5'/%3E%3C/g%3E%3C/svg%3E\")\n  }";
    styleInject(css_248z$5);

    /* src/ui/Pages.svelte generated by Svelte v3.44.2 */

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i].id;
    	child_ctx[6] = list[i].name;
    	return child_ctx;
    }

    // (32:2) <Title>
    function create_default_slot_8(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Select the pages you want to export");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (35:6) <Checkbox                  value={id}         id={id}         name="pages"         selected={$exportPageIds.includes(id)}         on:change={click}       >
    function create_default_slot_7$1(ctx) {
    	let t_value = /*name*/ ctx[6] + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*$pages*/ 4 && t_value !== (t_value = /*name*/ ctx[6] + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (34:4) {#each $pages as { id, name }}
    function create_each_block$1(ctx) {
    	let checkbox;
    	let current;

    	checkbox = new Checkbox({
    			props: {
    				value: /*id*/ ctx[5],
    				id: /*id*/ ctx[5],
    				name: "pages",
    				selected: /*$exportPageIds*/ ctx[0].includes(/*id*/ ctx[5]),
    				$$slots: { default: [create_default_slot_7$1] },
    				$$scope: { ctx }
    			}
    		});

    	checkbox.$on("change", /*click*/ ctx[3]);

    	return {
    		c() {
    			create_component(checkbox.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(checkbox, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const checkbox_changes = {};
    			if (dirty & /*$pages*/ 4) checkbox_changes.value = /*id*/ ctx[5];
    			if (dirty & /*$pages*/ 4) checkbox_changes.id = /*id*/ ctx[5];
    			if (dirty & /*$exportPageIds, $pages*/ 5) checkbox_changes.selected = /*$exportPageIds*/ ctx[0].includes(/*id*/ ctx[5]);

    			if (dirty & /*$$scope, $pages*/ 516) {
    				checkbox_changes.$$scope = { dirty, ctx };
    			}

    			checkbox.$set(checkbox_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(checkbox.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(checkbox.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(checkbox, detaching);
    		}
    	};
    }

    // (33:2) <Content class="columns">
    function create_default_slot_6$1(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*$pages*/ ctx[2];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*$pages, $exportPageIds, click*/ 13) {
    				each_value = /*$pages*/ ctx[2];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (45:4) <Title>
    function create_default_slot_5$2(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Select the pages");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (44:2) <Sidebar class="sidebar">
    function create_default_slot_4$3(ctx) {
    	let title;
    	let t0;
    	let ol;
    	let current;

    	title = new Title({
    			props: {
    				$$slots: { default: [create_default_slot_5$2] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(title.$$.fragment);
    			t0 = space();
    			ol = element("ol");

    			ol.innerHTML = `<li>Select the pages you want all separate images from to be created</li> 
      <li>Click the &#39;Prepare the selection&#39; button. All data wil be prepared.</li> 
      <li>The next page will give you an overview of all the images to be created</li> 
      <li>From there you can start the actual creation of all the images</li> 
      <li>All images are contained in a zipp file</li>`;
    		},
    		m(target, anchor) {
    			mount_component(title, target, anchor);
    			insert(target, t0, anchor);
    			insert(target, ol, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const title_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				title_changes.$$scope = { dirty, ctx };
    			}

    			title.$set(title_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(title.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(title.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(title, detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(ol);
    		}
    	};
    }

    // (55:4) <Button onClick={exportPageIds.clearSelection} disabled={!showButton}>
    function create_default_slot_3$3(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Clear selection");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (56:4) <Button onClick={prepareExport} disabled={!showButton}>
    function create_default_slot_2$3(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Prepare the selection");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (54:2) <ButtonFooter>
    function create_default_slot_1$3(ctx) {
    	let button0;
    	let t;
    	let button1;
    	let current;

    	button0 = new Button({
    			props: {
    				onClick: exportPageIds.clearSelection,
    				disabled: !/*showButton*/ ctx[1],
    				$$slots: { default: [create_default_slot_3$3] },
    				$$scope: { ctx }
    			}
    		});

    	button1 = new Button({
    			props: {
    				onClick: /*prepareExport*/ ctx[4],
    				disabled: !/*showButton*/ ctx[1],
    				$$slots: { default: [create_default_slot_2$3] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(button0.$$.fragment);
    			t = space();
    			create_component(button1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button0, target, anchor);
    			insert(target, t, anchor);
    			mount_component(button1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button0_changes = {};
    			if (dirty & /*showButton*/ 2) button0_changes.disabled = !/*showButton*/ ctx[1];

    			if (dirty & /*$$scope*/ 512) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};
    			if (dirty & /*showButton*/ 2) button1_changes.disabled = !/*showButton*/ ctx[1];

    			if (dirty & /*$$scope*/ 512) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button0, detaching);
    			if (detaching) detach(t);
    			destroy_component(button1, detaching);
    		}
    	};
    }

    // (31:0) <PageLayout class="pages-page">
    function create_default_slot$3(ctx) {
    	let title;
    	let t0;
    	let content;
    	let t1;
    	let sidebar;
    	let t2;
    	let buttonfooter;
    	let current;

    	title = new Title({
    			props: {
    				$$slots: { default: [create_default_slot_8] },
    				$$scope: { ctx }
    			}
    		});

    	content = new Content({
    			props: {
    				class: "columns",
    				$$slots: { default: [create_default_slot_6$1] },
    				$$scope: { ctx }
    			}
    		});

    	sidebar = new Sidebar({
    			props: {
    				class: "sidebar",
    				$$slots: { default: [create_default_slot_4$3] },
    				$$scope: { ctx }
    			}
    		});

    	buttonfooter = new ButtonFooter({
    			props: {
    				$$slots: { default: [create_default_slot_1$3] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(title.$$.fragment);
    			t0 = space();
    			create_component(content.$$.fragment);
    			t1 = space();
    			create_component(sidebar.$$.fragment);
    			t2 = space();
    			create_component(buttonfooter.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(title, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(content, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(sidebar, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(buttonfooter, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const title_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				title_changes.$$scope = { dirty, ctx };
    			}

    			title.$set(title_changes);
    			const content_changes = {};

    			if (dirty & /*$$scope, $pages, $exportPageIds*/ 517) {
    				content_changes.$$scope = { dirty, ctx };
    			}

    			content.$set(content_changes);
    			const sidebar_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				sidebar_changes.$$scope = { dirty, ctx };
    			}

    			sidebar.$set(sidebar_changes);
    			const buttonfooter_changes = {};

    			if (dirty & /*$$scope, showButton*/ 514) {
    				buttonfooter_changes.$$scope = { dirty, ctx };
    			}

    			buttonfooter.$set(buttonfooter_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(title.$$.fragment, local);
    			transition_in(content.$$.fragment, local);
    			transition_in(sidebar.$$.fragment, local);
    			transition_in(buttonfooter.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(title.$$.fragment, local);
    			transition_out(content.$$.fragment, local);
    			transition_out(sidebar.$$.fragment, local);
    			transition_out(buttonfooter.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(title, detaching);
    			if (detaching) detach(t0);
    			destroy_component(content, detaching);
    			if (detaching) detach(t1);
    			destroy_component(sidebar, detaching);
    			if (detaching) detach(t2);
    			destroy_component(buttonfooter, detaching);
    		}
    	};
    }

    function create_fragment$5(ctx) {
    	let pagelayout;
    	let current;

    	pagelayout = new PageLayout({
    			props: {
    				class: "pages-page",
    				$$slots: { default: [create_default_slot$3] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(pagelayout.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(pagelayout, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const pagelayout_changes = {};

    			if (dirty & /*$$scope, showButton, $pages, $exportPageIds*/ 519) {
    				pagelayout_changes.$$scope = { dirty, ctx };
    			}

    			pagelayout.$set(pagelayout_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(pagelayout.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(pagelayout.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(pagelayout, detaching);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let showButton;
    	let $exportPageIds;
    	let $pages;
    	component_subscribe($$self, exportPageIds, $$value => $$invalidate(0, $exportPageIds = $$value));
    	component_subscribe($$self, pages, $$value => $$invalidate(2, $pages = $$value));
    	pages.getPages();

    	const click = event => {
    		exportPageIds.togglePage(event.detail.value);
    	};

    	const prepareExport = () => {
    		parent.postMessage(
    			{
    				pluginMessage: {
    					type: MessageTypes.PrepareExport,
    					data: $exportPageIds
    				}
    			},
    			'*'
    		);

    		routes.setPage(RoutePages.DownloadList);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$exportPageIds*/ 1) {
    			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    			$$invalidate(1, showButton = $exportPageIds.length > 0);
    		}
    	};

    	return [$exportPageIds, showButton, $pages, click, prepareExport];
    }

    class Pages extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$4, create_fragment$5, safe_not_equal, {});
    	}
    }

    var css_248z$4 = ".breadcrumb.svelte-dafxbp{border:none;background:none;font-size:var(--font-size-xsmall);color:var(--figma-color-text-secondary);font-weight:400}.breadcrumb.active.svelte-dafxbp{color:var(--figma-color-text);font-weight:600}";
    styleInject(css_248z$4);

    /* src/components/BreadCrumb.svelte generated by Svelte v3.44.2 */

    function create_fragment$4(ctx) {
    	let button;
    	let t;
    	let button_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	return {
    		c() {
    			button = element("button");
    			if (default_slot) default_slot.c();
    			t = text(" >");
    			attr(button, "class", button_class_value = "breadcrumb " + /*activeClass*/ ctx[0] + " svelte-dafxbp");
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);

    			if (default_slot) {
    				default_slot.m(button, null);
    			}

    			append(button, t);
    			current = true;

    			if (!mounted) {
    				dispose = listen(button, "click", /*handleBreadCrumbClick*/ ctx[1]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[4],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*activeClass*/ 1 && button_class_value !== (button_class_value = "breadcrumb " + /*activeClass*/ ctx[0] + " svelte-dafxbp")) {
    				attr(button, "class", button_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let activeClass;
    	let $routes;
    	component_subscribe($$self, routes, $$value => $$invalidate(3, $routes = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { to } = $$props;

    	const handleBreadCrumbClick = () => {
    		routes.setPage(to);
    	};

    	$$self.$$set = $$props => {
    		if ('to' in $$props) $$invalidate(2, to = $$props.to);
    		if ('$$scope' in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*to, $routes*/ 12) {
    			$$invalidate(0, activeClass = to === $routes.currentPage ? 'active' : '');
    		}
    	};

    	return [activeClass, handleBreadCrumbClick, to, $routes, $$scope, slots];
    }

    class BreadCrumb extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$4, safe_not_equal, { to: 2 });
    	}
    }

    var css_248z$3 = ".sidebar.bg-image{background-image:url(\"data:image/svg+xml,%3Csvg viewBox='0 0 727 752' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M343.156 431.465C321.88 431.465 301.137 438.126 283.839 450.512C266.54 462.899 253.553 480.391 246.7 500.533C243.549 509.808 230.373 509.889 227 500.691C209.93 454.091 200.6 370.796 321.906 365.75C378.114 363.413 375.923 431.465 343.156 431.465Z' fill='%230CBC8B'/%3E%3Cpath d='M368.616 431.465C389.892 431.466 410.634 438.126 427.932 450.513C445.23 462.9 458.217 480.391 465.07 500.533C468.221 509.808 481.397 509.889 484.77 500.691C501.839 454.091 511.17 370.796 389.863 365.75C333.658 363.413 335.85 431.465 368.616 431.465Z' fill='%230CBC8B'/%3E%3Cpath d='M415.836 690.529L290.227 677.616L318.115 211.384H387.376L415.836 690.529Z' fill='%23F3F5FD'/%3E%3Cpath d='M670.448 699.36C667.295 699.363 664.148 699.628 661.038 700.15C656.3 682.955 647.818 667.02 636.2 653.487C624.583 639.954 610.116 629.157 593.837 621.87C577.558 614.582 559.869 610.984 542.036 611.333C524.204 611.683 506.669 615.971 490.688 623.89C486.244 610.501 477.901 598.745 466.728 590.132C455.556 581.518 442.064 576.44 427.985 575.549C413.906 574.658 399.882 577.995 387.712 585.131C375.543 592.268 365.784 602.878 359.688 615.6C356.45 602.154 348.778 590.191 337.909 581.639C327.04 573.087 313.608 568.444 299.778 568.46C298.268 568.46 296.778 568.51 295.298 568.62C282.541 569.554 270.39 574.432 260.528 582.579C250.667 590.726 243.583 601.738 240.258 614.09C227.26 609.33 213.346 607.603 199.579 609.042C185.811 610.48 172.555 615.045 160.821 622.389C149.088 629.733 139.188 639.661 131.877 651.415C124.566 663.169 120.038 676.439 118.638 690.21C108.972 690.953 99.6789 694.256 91.7123 699.78C83.7457 705.303 77.3934 712.849 73.3081 721.64C66.5626 718.651 59.2811 717.061 51.9036 716.964C44.5261 716.868 37.2057 718.269 30.3846 721.081C23.5635 723.894 17.3833 728.059 12.2174 733.327C7.0514 738.595 3.00688 744.855 0.328125 751.73H726.648C725.647 737.509 719.291 724.197 708.861 714.478C698.431 704.759 684.704 699.356 670.448 699.36Z' fill='%23F3F5FD'/%3E%3Cpath d='M408.2 451.725H295.549V488.956H408.2V451.725Z' fill='%23C1D8ED'/%3E%3Cpath d='M445.538 267.67C445.538 331.13 427.878 419.42 415.088 465.3H290.4C277.61 419.42 259.95 331.13 259.95 267.67C259.95 119.84 352.75 0 352.75 0C352.75 0 445.538 119.84 445.538 267.67Z' fill='%239EBCEA'/%3E%3Cpath d='M352.743 275.071C381.569 275.071 404.937 251.703 404.937 222.877C404.937 194.051 381.569 170.683 352.743 170.683C323.917 170.683 300.549 194.051 300.549 222.877C300.549 251.703 323.917 275.071 352.743 275.071Z' fill='white'/%3E%3Cpath d='M352.743 261.41C374.024 261.41 391.276 244.158 391.276 222.877C391.276 201.596 374.024 184.344 352.743 184.344C331.462 184.344 314.21 201.596 314.21 222.877C314.21 244.158 331.462 261.41 352.743 261.41Z' fill='%23DEE8F5'/%3E%3Cpath d='M416.248 118.19H289.238C316.438 46.89 352.748 0 352.748 0C352.748 0 389.058 46.89 416.248 118.19Z' fill='%230CBC8B'/%3E%3C/svg%3E\");background-position:bottom center;background-repeat:no-repeat}ol.svelte-19m576p{padding-left:1.5rem}li.svelte-19m576p{margin-bottom:.75rem}li.svelte-19m576p::marker{font-weight:bold}";
    styleInject(css_248z$3);

    /* src/ui/Start.svelte generated by Svelte v3.44.2 */

    function create_default_slot_4$2(ctx) {
    	let h2;

    	return {
    		c() {
    			h2 = element("h2");
    			h2.textContent = "Move your export to new heights";
    		},
    		m(target, anchor) {
    			insert(target, h2, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(h2);
    		}
    	};
    }

    // (15:2) <Content>
    function create_default_slot_3$2(ctx) {
    	let p0;
    	let t1;
    	let ol;
    	let t7;
    	let p1;

    	return {
    		c() {
    			p0 = element("p");
    			p0.textContent = "Create complex exports in just 2.5 steps";
    			t1 = space();
    			ol = element("ol");

    			ol.innerHTML = `<li class="svelte-19m576p">Select your pages</li> 
      <li class="svelte-19m576p">Check the list with exported files and folders</li> 
      <li class="svelte-19m576p">Click the Export button</li>`;

    			t7 = space();
    			p1 = element("p");
    			p1.innerHTML = `Read more documentation at <a href="/">Here</a>`;
    			attr(ol, "class", "svelte-19m576p");
    		},
    		m(target, anchor) {
    			insert(target, p0, anchor);
    			insert(target, t1, anchor);
    			insert(target, ol, anchor);
    			insert(target, t7, anchor);
    			insert(target, p1, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(p0);
    			if (detaching) detach(t1);
    			if (detaching) detach(ol);
    			if (detaching) detach(t7);
    			if (detaching) detach(p1);
    		}
    	};
    }

    // (27:4) <Button onClick={start}>
    function create_default_slot_2$2(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Start");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (26:2) <ButtonFooter>
    function create_default_slot_1$2(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				onClick: /*start*/ ctx[0],
    				$$slots: { default: [create_default_slot_2$2] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 2) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    }

    // (13:0) <PageLayout class="start-page">
    function create_default_slot$2(ctx) {
    	let title;
    	let t0;
    	let content;
    	let t1;
    	let buttonfooter;
    	let t2;
    	let sidebar;
    	let current;

    	title = new Title({
    			props: {
    				$$slots: { default: [create_default_slot_4$2] },
    				$$scope: { ctx }
    			}
    		});

    	content = new Content({
    			props: {
    				$$slots: { default: [create_default_slot_3$2] },
    				$$scope: { ctx }
    			}
    		});

    	buttonfooter = new ButtonFooter({
    			props: {
    				$$slots: { default: [create_default_slot_1$2] },
    				$$scope: { ctx }
    			}
    		});

    	sidebar = new Sidebar({ props: { class: "bg-image" } });

    	return {
    		c() {
    			create_component(title.$$.fragment);
    			t0 = space();
    			create_component(content.$$.fragment);
    			t1 = space();
    			create_component(buttonfooter.$$.fragment);
    			t2 = space();
    			create_component(sidebar.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(title, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(content, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(buttonfooter, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(sidebar, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const title_changes = {};

    			if (dirty & /*$$scope*/ 2) {
    				title_changes.$$scope = { dirty, ctx };
    			}

    			title.$set(title_changes);
    			const content_changes = {};

    			if (dirty & /*$$scope*/ 2) {
    				content_changes.$$scope = { dirty, ctx };
    			}

    			content.$set(content_changes);
    			const buttonfooter_changes = {};

    			if (dirty & /*$$scope*/ 2) {
    				buttonfooter_changes.$$scope = { dirty, ctx };
    			}

    			buttonfooter.$set(buttonfooter_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(title.$$.fragment, local);
    			transition_in(content.$$.fragment, local);
    			transition_in(buttonfooter.$$.fragment, local);
    			transition_in(sidebar.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(title.$$.fragment, local);
    			transition_out(content.$$.fragment, local);
    			transition_out(buttonfooter.$$.fragment, local);
    			transition_out(sidebar.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(title, detaching);
    			if (detaching) detach(t0);
    			destroy_component(content, detaching);
    			if (detaching) detach(t1);
    			destroy_component(buttonfooter, detaching);
    			if (detaching) detach(t2);
    			destroy_component(sidebar, detaching);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	let pagelayout;
    	let current;

    	pagelayout = new PageLayout({
    			props: {
    				class: "start-page",
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(pagelayout.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(pagelayout, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const pagelayout_changes = {};

    			if (dirty & /*$$scope*/ 2) {
    				pagelayout_changes.$$scope = { dirty, ctx };
    			}

    			pagelayout.$set(pagelayout_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(pagelayout.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(pagelayout.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(pagelayout, detaching);
    		}
    	};
    }

    function instance$2($$self) {
    	const start = () => {
    		routes.setPage(RoutePages.Pages);
    	};

    	return [start];
    }

    class Start extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$3, safe_not_equal, {});
    	}
    }

    var css_248z$2 = ".radio.svelte-1vb10xj.svelte-1vb10xj.svelte-1vb10xj{align-items:center;cursor:default;display:flex;height:var(--size-medium)}.radio.svelte-1vb10xj input.svelte-1vb10xj.svelte-1vb10xj{clip:rect(0,0,0,0);position:absolute}.radio.svelte-1vb10xj label.svelte-1vb10xj.svelte-1vb10xj{align-items:center;border:1px solid transparent;display:flex;font-size:var(--font-size-xsmall);padding:0 var(--size-xsmall) 0 var(--size-xsmall);height:100%;user-select:none;width:calc(100% + var(--size-xsmall));margin-left:calc(-1 * var(--size-xsmall))}.radio.svelte-1vb10xj label.svelte-1vb10xj.svelte-1vb10xj:hover{border-color:var(--blue)}.radio.svelte-1vb10xj input.svelte-1vb10xj:disabled+label.svelte-1vb10xj{color:var(--black);opacity:0.3}.radio.svelte-1vb10xj input.svelte-1vb10xj:checked+label.svelte-1vb10xj{background-color:#daebf7}";
    styleInject(css_248z$2);

    /* src/components/RadioItem.svelte generated by Svelte v3.44.2 */

    function create_fragment$2(ctx) {
    	let section;
    	let input;
    	let t;
    	let label;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	return {
    		c() {
    			section = element("section");
    			input = element("input");
    			t = space();
    			label = element("label");
    			if (default_slot) default_slot.c();
    			input.value = /*value*/ ctx[0];
    			attr(input, "name", /*name*/ ctx[1]);
    			attr(input, "id", /*id*/ ctx[2]);
    			attr(input, "type", "radio");
    			attr(input, "class", "svelte-1vb10xj");
    			attr(label, "for", /*id*/ ctx[2]);
    			attr(label, "class", "svelte-1vb10xj");
    			attr(section, "class", "radio svelte-1vb10xj");
    		},
    		m(target, anchor) {
    			insert(target, section, anchor);
    			append(section, input);
    			append(section, t);
    			append(section, label);

    			if (default_slot) {
    				default_slot.m(label, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen(input, "change", /*handleChange*/ ctx[3]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (!current || dirty & /*value*/ 1) {
    				input.value = /*value*/ ctx[0];
    			}

    			if (!current || dirty & /*name*/ 2) {
    				attr(input, "name", /*name*/ ctx[1]);
    			}

    			if (!current || dirty & /*id*/ 4) {
    				attr(input, "id", /*id*/ ctx[2]);
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[4],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*id*/ 4) {
    				attr(label, "for", /*id*/ ctx[2]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(section);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { value } = $$props;
    	let { name } = $$props;
    	let { id } = $$props;
    	const dispatch = createEventDispatcher();

    	const handleChange = () => {
    		dispatch('change', { value, id });
    	};

    	$$self.$$set = $$props => {
    		if ('value' in $$props) $$invalidate(0, value = $$props.value);
    		if ('name' in $$props) $$invalidate(1, name = $$props.name);
    		if ('id' in $$props) $$invalidate(2, id = $$props.id);
    		if ('$$scope' in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	return [value, name, id, handleChange, $$scope, slots];
    }

    class RadioItem extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$2, safe_not_equal, { value: 0, name: 1, id: 2 });
    	}
    }

    const createDownloadList = () => {
        const { subscribe, set } = writable({});
        return {
            subscribe,
            setList: (downloads) => set(downloads),
        };
    };
    const downloadList = createDownloadList();

    const createDownloadStatus = () => {
        const { subscribe, set } = writable('');
        return {
            subscribe,
            setMessage: (message) => set(message),
        };
    };
    const downloadStatus = createDownloadStatus();

    var css_248z$1 = ".download-page .bg-image{background-position:bottom 1rem center;background-size:80%;background-image:url(\"data:image/svg+xml,%3Csvg viewBox='0 0 810 537' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cg clip-path='url(%23clip0_1228_2479)'%3E%3Cpath d='M631.816 243.298H583.15C576.998 243.298 572.011 248.285 572.011 254.437V296.536C572.011 302.688 576.998 307.675 583.15 307.675H631.816C637.968 307.675 642.955 302.688 642.955 296.536V254.437C642.955 248.285 637.968 243.298 631.816 243.298Z' fill='%23C1D8ED'/%3E%3Cpath d='M296.581 48.518H230.93C222.631 48.518 215.903 55.2458 215.903 63.545V120.337C215.903 128.636 222.631 135.364 230.93 135.364H296.581C304.88 135.364 311.608 128.636 311.608 120.337V63.545C311.608 55.2458 304.88 48.518 296.581 48.518Z' fill='%230CBC8B'/%3E%3Cpath d='M404.282 24.206C404.553 24.2004 404.823 24.2191 405.091 24.262V24.262C411.824 26.501 413.871 29.784 414.986 32.701C416.149 36.0728 416.568 39.6569 416.212 43.206C415.671 48.7947 413.505 54.1025 409.98 58.473C408.241 60.5761 406.105 62.3154 403.693 63.5912C401.281 64.867 398.641 65.6544 395.925 65.908C383.482 67.3319 370.965 68.0111 358.441 67.942C352.951 67.942 347.315 67.836 341.532 67.624C351.177 57.6303 361.562 48.3787 372.6 39.948C392.7 24.965 402.517 24.206 404.282 24.206V24.206ZM404.282 0.206014C379.647 0.206014 341.282 28.651 298.971 78.876C298.229 79.7186 297.743 80.7548 297.568 81.8637C297.393 82.9725 297.537 84.1081 297.984 85.138C298.387 86.2022 299.085 87.1297 299.996 87.8123C300.906 88.4948 301.992 88.9044 303.127 88.993C318.442 90.531 338.053 91.941 358.441 91.941C371.932 92.0093 385.416 91.2717 398.82 89.732C424.587 86.601 438.12 65.311 440.093 45.6C440.893 37.655 441.269 11 412.659 1.48601C409.954 0.61137 407.125 0.179145 404.282 0.206014V0.206014Z' fill='%230CBC8B'/%3E%3Cpath d='M124.282 24.207C126.047 24.207 135.87 24.966 155.967 39.948C167.004 48.3785 177.389 57.6301 187.034 67.624C181.255 67.8353 175.618 67.941 170.122 67.941C157.598 68.0105 145.081 67.3313 132.638 65.907C129.921 65.6532 127.282 64.8658 124.87 63.59C122.459 62.3141 120.323 60.5749 118.585 58.472C115.059 54.1002 112.892 48.7911 112.352 43.201C111.997 39.6535 112.416 36.0713 113.579 32.701C114.694 29.784 116.742 26.501 123.442 24.272C123.719 24.2208 124 24.1993 124.282 24.208V24.207ZM124.282 0.208018C121.439 0.180917 118.611 0.612803 115.906 1.48702C87.2998 11 87.6738 37.655 88.4718 45.6C90.4488 65.311 103.978 86.6 129.743 89.732C143.146 91.2724 156.63 92.0104 170.122 91.942C190.515 91.942 210.122 90.531 225.439 88.993C226.573 88.9046 227.659 88.4952 228.569 87.8128C229.479 87.1303 230.176 86.203 230.579 85.139C231.025 84.1089 231.169 82.973 230.994 81.864C230.82 80.755 230.333 79.7187 229.591 78.876C187.286 28.651 148.92 0.207019 124.282 0.207019V0.208018Z' fill='%230CBC8B'/%3E%3Cpath d='M491.392 143.373H32.1199V537.42H491.392V143.373Z' fill='%230CBC8B'/%3E%3Cpath d='M307.13 144.161H216.382V537.42H307.13V144.161Z' fill='white'/%3E%3Cg opacity='0.19'%3E%3Cpath opacity='0.19' d='M491.392 143.373H32.1199V225.267H491.392V143.373Z' fill='black'/%3E%3C/g%3E%3Cpath d='M523.297 82.782H0.213867V164.188H523.297V82.782Z' fill='%230CBC8B'/%3E%3Cpath d='M327.622 82.782H195.889V164.188H327.622V82.782Z' fill='white'/%3E%3Cpath d='M716.875 229.44C720.744 230.806 721.675 232.505 722.251 233.998C722.987 236.162 723.247 238.459 723.012 240.732C722.787 242.976 721.102 254.238 709.983 255.589C700.385 256.686 690.73 257.209 681.07 257.155C679.234 257.155 677.376 257.14 675.496 257.109C698.34 235.081 712.542 229.467 716.875 229.44V229.44ZM716.907 207.44C697.648 207.44 667.655 229.677 634.578 268.94C633.997 269.599 633.616 270.41 633.48 271.278C633.343 272.145 633.456 273.034 633.806 273.84C634.121 274.672 634.667 275.397 635.379 275.931C636.09 276.464 636.939 276.785 637.826 276.854C649.799 278.054 665.126 279.154 681.07 279.154C691.618 279.208 702.159 278.631 712.637 277.427C732.781 274.98 743.357 258.335 744.903 242.927C745.527 236.716 745.822 215.874 723.456 208.44C721.341 207.757 719.13 207.419 716.907 207.44V207.44Z' fill='%23C1D8ED'/%3E%3Cpath d='M498.042 229.44C502.374 229.467 516.577 235.08 539.422 257.11C537.542 257.14 535.683 257.155 533.846 257.156C524.186 257.21 514.531 256.687 504.933 255.589C493.815 254.238 492.133 242.976 491.904 240.727C491.671 238.455 491.931 236.16 492.666 233.998C493.237 232.505 494.174 230.806 498.042 229.44V229.44ZM498.01 207.44C495.788 207.419 493.577 207.756 491.462 208.44C469.095 215.874 469.39 236.716 470.015 242.927C471.56 258.336 482.137 274.981 502.279 277.427C512.757 278.632 523.299 279.209 533.846 279.155C549.789 279.155 565.116 278.055 577.091 276.85C577.978 276.781 578.826 276.461 579.538 275.927C580.25 275.394 580.795 274.669 581.11 273.837C581.459 273.031 581.572 272.143 581.436 271.275C581.299 270.407 580.918 269.596 580.338 268.937C547.265 229.673 517.271 207.437 498.01 207.437V207.44Z' fill='%23C1D8ED'/%3E%3Cpath d='M785.007 319.363H425.96V537.419H785.007V319.363Z' fill='%23C1D8ED'/%3E%3Cpath d='M640.955 319.979H570.011V537.419H640.955V319.979Z' fill='white'/%3E%3Cg opacity='0.19'%3E%3Cpath opacity='0.19' d='M785.007 319.363H425.96V383.386H785.007V319.363Z' fill='black'/%3E%3C/g%3E%3Cpath d='M809.95 271.995H401.017V335.636H809.95V271.995Z' fill='%23C1D8ED'/%3E%3Cpath d='M656.977 271.995H553.991V335.636H656.977V271.995Z' fill='white'/%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='clip0_1228_2479'%3E%3Crect width='810' height='537' fill='white'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E\")}.download-page .content{padding-bottom:0}.split-view.svelte-1eqqrf0{display:grid;grid-template-columns:1fr 1fr;gap:1rem;height:100%}.image-list.svelte-1eqqrf0{height:100%;overflow:scroll}";
    styleInject(css_248z$1);

    /* src/ui/Download.svelte generated by Svelte v3.44.2 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    // (28:2) <Title>
    function create_default_slot_7(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Download Overview");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (33:10) <RadioItem name="folder" id={folder} value={folder} on:change={change}>
    function create_default_slot_6(ctx) {
    	let t_value = /*folder*/ ctx[8] + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*$downloadList*/ 1 && t_value !== (t_value = /*folder*/ ctx[8] + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (32:8) {#each Object.keys($downloadList) as folder}
    function create_each_block_1(ctx) {
    	let radioitem;
    	let current;

    	radioitem = new RadioItem({
    			props: {
    				name: "folder",
    				id: /*folder*/ ctx[8],
    				value: /*folder*/ ctx[8],
    				$$slots: { default: [create_default_slot_6] },
    				$$scope: { ctx }
    			}
    		});

    	radioitem.$on("change", /*change*/ ctx[3]);

    	return {
    		c() {
    			create_component(radioitem.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(radioitem, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const radioitem_changes = {};
    			if (dirty & /*$downloadList*/ 1) radioitem_changes.id = /*folder*/ ctx[8];
    			if (dirty & /*$downloadList*/ 1) radioitem_changes.value = /*folder*/ ctx[8];

    			if (dirty & /*$$scope, $downloadList*/ 2049) {
    				radioitem_changes.$$scope = { dirty, ctx };
    			}

    			radioitem.$set(radioitem_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(radioitem.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(radioitem.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(radioitem, detaching);
    		}
    	};
    }

    // (37:8) {#each Object.values(files) as file}
    function create_each_block(ctx) {
    	let div;
    	let t0_value = /*file*/ ctx[5].name + "";
    	let t0;
    	let t1;
    	let t2_value = /*file*/ ctx[5].scale + "";
    	let t2;
    	let t3;

    	return {
    		c() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = text(" (scale: ");
    			t2 = text(t2_value);
    			t3 = text(")");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, t1);
    			append(div, t2);
    			append(div, t3);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*files*/ 2 && t0_value !== (t0_value = /*file*/ ctx[5].name + "")) set_data(t0, t0_value);
    			if (dirty & /*files*/ 2 && t2_value !== (t2_value = /*file*/ ctx[5].scale + "")) set_data(t2, t2_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (29:2) <Content>
    function create_default_slot_5$1(ctx) {
    	let section2;
    	let section0;
    	let t;
    	let section1;
    	let current;
    	let each_value_1 = Object.keys(/*$downloadList*/ ctx[0]);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks_1[i], 1, 1, () => {
    		each_blocks_1[i] = null;
    	});

    	let each_value = Object.values(/*files*/ ctx[1]);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			section2 = element("section");
    			section0 = element("section");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t = space();
    			section1 = element("section");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(section0, "class", "folder-list");
    			attr(section1, "class", "image-list svelte-1eqqrf0");
    			attr(section2, "class", "split-view svelte-1eqqrf0");
    		},
    		m(target, anchor) {
    			insert(target, section2, anchor);
    			append(section2, section0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(section0, null);
    			}

    			append(section2, t);
    			append(section2, section1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(section1, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*Object, $downloadList, change*/ 9) {
    				each_value_1 = Object.keys(/*$downloadList*/ ctx[0]);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    						transition_in(each_blocks_1[i], 1);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						transition_in(each_blocks_1[i], 1);
    						each_blocks_1[i].m(section0, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks_1.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty & /*Object, files*/ 2) {
    				each_value = Object.values(/*files*/ ctx[1]);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(section1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks_1 = each_blocks_1.filter(Boolean);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(section2);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (44:4) <Title>
    function create_default_slot_4$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Only one step left to get your present");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (43:2) <Sidebar class="bg-image">
    function create_default_slot_3$1(ctx) {
    	let title;
    	let t0;
    	let ol;
    	let current;

    	title = new Title({
    			props: {
    				$$slots: { default: [create_default_slot_4$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(title.$$.fragment);
    			t0 = space();
    			ol = element("ol");

    			ol.innerHTML = `<li>If you want, you&#39;re able to check the files (At least the names and the scale)</li> 
      <li>Click the download button and wait a couple of seconds</li>`;
    		},
    		m(target, anchor) {
    			mount_component(title, target, anchor);
    			insert(target, t0, anchor);
    			insert(target, ol, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const title_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				title_changes.$$scope = { dirty, ctx };
    			}

    			title.$set(title_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(title.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(title.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(title, detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(ol);
    		}
    	};
    }

    // (51:4) <Button onClick={startDownload}>
    function create_default_slot_2$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Start Download");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (50:2) <ButtonFooter>
    function create_default_slot_1$1(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				onClick: /*startDownload*/ ctx[2],
    				$$slots: { default: [create_default_slot_2$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    }

    // (27:0) <PageLayout class="download-page">
    function create_default_slot$1(ctx) {
    	let title;
    	let t0;
    	let content;
    	let t1;
    	let sidebar;
    	let t2;
    	let buttonfooter;
    	let current;

    	title = new Title({
    			props: {
    				$$slots: { default: [create_default_slot_7] },
    				$$scope: { ctx }
    			}
    		});

    	content = new Content({
    			props: {
    				$$slots: { default: [create_default_slot_5$1] },
    				$$scope: { ctx }
    			}
    		});

    	sidebar = new Sidebar({
    			props: {
    				class: "bg-image",
    				$$slots: { default: [create_default_slot_3$1] },
    				$$scope: { ctx }
    			}
    		});

    	buttonfooter = new ButtonFooter({
    			props: {
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(title.$$.fragment);
    			t0 = space();
    			create_component(content.$$.fragment);
    			t1 = space();
    			create_component(sidebar.$$.fragment);
    			t2 = space();
    			create_component(buttonfooter.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(title, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(content, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(sidebar, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(buttonfooter, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const title_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				title_changes.$$scope = { dirty, ctx };
    			}

    			title.$set(title_changes);
    			const content_changes = {};

    			if (dirty & /*$$scope, files, $downloadList*/ 2051) {
    				content_changes.$$scope = { dirty, ctx };
    			}

    			content.$set(content_changes);
    			const sidebar_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				sidebar_changes.$$scope = { dirty, ctx };
    			}

    			sidebar.$set(sidebar_changes);
    			const buttonfooter_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				buttonfooter_changes.$$scope = { dirty, ctx };
    			}

    			buttonfooter.$set(buttonfooter_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(title.$$.fragment, local);
    			transition_in(content.$$.fragment, local);
    			transition_in(sidebar.$$.fragment, local);
    			transition_in(buttonfooter.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(title.$$.fragment, local);
    			transition_out(content.$$.fragment, local);
    			transition_out(sidebar.$$.fragment, local);
    			transition_out(buttonfooter.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(title, detaching);
    			if (detaching) detach(t0);
    			destroy_component(content, detaching);
    			if (detaching) detach(t1);
    			destroy_component(sidebar, detaching);
    			if (detaching) detach(t2);
    			destroy_component(buttonfooter, detaching);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	let pagelayout;
    	let current;

    	pagelayout = new PageLayout({
    			props: {
    				class: "download-page",
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(pagelayout.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(pagelayout, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const pagelayout_changes = {};

    			if (dirty & /*$$scope, files, $downloadList*/ 2051) {
    				pagelayout_changes.$$scope = { dirty, ctx };
    			}

    			pagelayout.$set(pagelayout_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(pagelayout.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(pagelayout.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(pagelayout, detaching);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let files;
    	let $downloadList;
    	component_subscribe($$self, downloadList, $$value => $$invalidate(0, $downloadList = $$value));
    	let selected = '';

    	const startDownload = () => {
    		downloadStatus.setMessage('Download started');

    		parent.postMessage(
    			{
    				pluginMessage: {
    					type: MessageTypes.CreateDownload,
    					data: $downloadList
    				}
    			},
    			'*'
    		);
    	};

    	const change = event => {
    		$$invalidate(4, selected = event.detail.value);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$downloadList, selected*/ 17) {
    			$$invalidate(1, files = $downloadList[selected] || {});
    		}
    	};

    	return [$downloadList, files, startDownload, change, selected];
    }

    class Download extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment$1, safe_not_equal, {});
    	}
    }

    var css_248z = "main.svelte-1c9duvn{overflow:scroll}section.svelte-1c9duvn{display:grid;grid-template-rows:auto 1fr auto;height:100%}header.svelte-1c9duvn{align-items:center;border-bottom:1px solid var(--figma-color-border);display:flex;height:40px;padding:.5rem 1rem}footer.svelte-1c9duvn{border-top:1px solid var(--figma-color-border);padding:.5rem 1rem}";
    styleInject(css_248z);

    /* src/ui/App.svelte generated by Svelte v3.44.2 */

    function create_default_slot_5(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Start");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (12:4) <BreadCrumb to={RoutePages.Pages}>
    function create_default_slot_4(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Pages");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (13:4) <BreadCrumb to={RoutePages.DownloadList}>
    function create_default_slot_3(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("DownloadList");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (16:4) <Route page={RoutePages.Start}>
    function create_default_slot_2(ctx) {
    	let start;
    	let current;
    	start = new Start({});

    	return {
    		c() {
    			create_component(start.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(start, target, anchor);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(start.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(start.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(start, detaching);
    		}
    	};
    }

    // (19:4) <Route page={RoutePages.Pages}>
    function create_default_slot_1(ctx) {
    	let pages;
    	let current;
    	pages = new Pages({});

    	return {
    		c() {
    			create_component(pages.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(pages, target, anchor);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(pages.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(pages.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(pages, detaching);
    		}
    	};
    }

    // (22:4) <Route page={RoutePages.DownloadList}>
    function create_default_slot(ctx) {
    	let download;
    	let current;
    	download = new Download({});

    	return {
    		c() {
    			create_component(download.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(download, target, anchor);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(download.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(download.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(download, detaching);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let section;
    	let header;
    	let breadcrumb0;
    	let t0;
    	let breadcrumb1;
    	let t1;
    	let breadcrumb2;
    	let t2;
    	let main;
    	let route0;
    	let t3;
    	let route1;
    	let t4;
    	let route2;
    	let t5;
    	let footer;
    	let current;

    	breadcrumb0 = new BreadCrumb({
    			props: {
    				to: RoutePages.Start,
    				$$slots: { default: [create_default_slot_5] },
    				$$scope: { ctx }
    			}
    		});

    	breadcrumb1 = new BreadCrumb({
    			props: {
    				to: RoutePages.Pages,
    				$$slots: { default: [create_default_slot_4] },
    				$$scope: { ctx }
    			}
    		});

    	breadcrumb2 = new BreadCrumb({
    			props: {
    				to: RoutePages.DownloadList,
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			}
    		});

    	route0 = new Route({
    			props: {
    				page: RoutePages.Start,
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			}
    		});

    	route1 = new Route({
    			props: {
    				page: RoutePages.Pages,
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			}
    		});

    	route2 = new Route({
    			props: {
    				page: RoutePages.DownloadList,
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			section = element("section");
    			header = element("header");
    			create_component(breadcrumb0.$$.fragment);
    			t0 = space();
    			create_component(breadcrumb1.$$.fragment);
    			t1 = space();
    			create_component(breadcrumb2.$$.fragment);
    			t2 = space();
    			main = element("main");
    			create_component(route0.$$.fragment);
    			t3 = space();
    			create_component(route1.$$.fragment);
    			t4 = space();
    			create_component(route2.$$.fragment);
    			t5 = space();
    			footer = element("footer");
    			footer.textContent = "Footer";
    			attr(header, "class", "svelte-1c9duvn");
    			attr(main, "class", "svelte-1c9duvn");
    			attr(footer, "class", "svelte-1c9duvn");
    			attr(section, "class", "svelte-1c9duvn");
    		},
    		m(target, anchor) {
    			insert(target, section, anchor);
    			append(section, header);
    			mount_component(breadcrumb0, header, null);
    			append(header, t0);
    			mount_component(breadcrumb1, header, null);
    			append(header, t1);
    			mount_component(breadcrumb2, header, null);
    			append(section, t2);
    			append(section, main);
    			mount_component(route0, main, null);
    			append(main, t3);
    			mount_component(route1, main, null);
    			append(main, t4);
    			mount_component(route2, main, null);
    			append(section, t5);
    			append(section, footer);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const breadcrumb0_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				breadcrumb0_changes.$$scope = { dirty, ctx };
    			}

    			breadcrumb0.$set(breadcrumb0_changes);
    			const breadcrumb1_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				breadcrumb1_changes.$$scope = { dirty, ctx };
    			}

    			breadcrumb1.$set(breadcrumb1_changes);
    			const breadcrumb2_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				breadcrumb2_changes.$$scope = { dirty, ctx };
    			}

    			breadcrumb2.$set(breadcrumb2_changes);
    			const route0_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				route0_changes.$$scope = { dirty, ctx };
    			}

    			route0.$set(route0_changes);
    			const route1_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				route1_changes.$$scope = { dirty, ctx };
    			}

    			route1.$set(route1_changes);
    			const route2_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				route2_changes.$$scope = { dirty, ctx };
    			}

    			route2.$set(route2_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(breadcrumb0.$$.fragment, local);
    			transition_in(breadcrumb1.$$.fragment, local);
    			transition_in(breadcrumb2.$$.fragment, local);
    			transition_in(route0.$$.fragment, local);
    			transition_in(route1.$$.fragment, local);
    			transition_in(route2.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(breadcrumb0.$$.fragment, local);
    			transition_out(breadcrumb1.$$.fragment, local);
    			transition_out(breadcrumb2.$$.fragment, local);
    			transition_out(route0.$$.fragment, local);
    			transition_out(route1.$$.fragment, local);
    			transition_out(route2.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(section);
    			destroy_component(breadcrumb0);
    			destroy_component(breadcrumb1);
    			destroy_component(breadcrumb2);
    			destroy_component(route0);
    			destroy_component(route1);
    			destroy_component(route2);
    		}
    	};
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment, safe_not_equal, {});
    	}
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function commonjsRequire (path) {
    	throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
    }

    var jszip_min = {exports: {}};

    /*!

    JSZip v3.7.1 - A JavaScript class for generating and reading zip files
    <http://stuartk.com/jszip>

    (c) 2009-2016 Stuart Knightley <stuart [at] stuartk.com>
    Dual licenced under the MIT license or GPLv3. See https://raw.github.com/Stuk/jszip/master/LICENSE.markdown.

    JSZip uses the library pako released under the MIT license :
    https://github.com/nodeca/pako/blob/master/LICENSE
    */

    (function (module, exports) {
    !function(t){module.exports=t();}(function(){return function s(a,o,h){function u(r,t){if(!o[r]){if(!a[r]){var e="function"==typeof commonjsRequire&&commonjsRequire;if(!t&&e)return e(r,!0);if(l)return l(r,!0);var i=new Error("Cannot find module '"+r+"'");throw i.code="MODULE_NOT_FOUND",i}var n=o[r]={exports:{}};a[r][0].call(n.exports,function(t){var e=a[r][1][t];return u(e||t)},n,n.exports,s,a,o,h);}return o[r].exports}for(var l="function"==typeof commonjsRequire&&commonjsRequire,t=0;t<h.length;t++)u(h[t]);return u}({1:[function(t,e,r){var c=t("./utils"),d=t("./support"),p="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";r.encode=function(t){for(var e,r,i,n,s,a,o,h=[],u=0,l=t.length,f=l,d="string"!==c.getTypeOf(t);u<t.length;)f=l-u,i=d?(e=t[u++],r=u<l?t[u++]:0,u<l?t[u++]:0):(e=t.charCodeAt(u++),r=u<l?t.charCodeAt(u++):0,u<l?t.charCodeAt(u++):0),n=e>>2,s=(3&e)<<4|r>>4,a=1<f?(15&r)<<2|i>>6:64,o=2<f?63&i:64,h.push(p.charAt(n)+p.charAt(s)+p.charAt(a)+p.charAt(o));return h.join("")},r.decode=function(t){var e,r,i,n,s,a,o=0,h=0,u="data:";if(t.substr(0,u.length)===u)throw new Error("Invalid base64 input, it looks like a data url.");var l,f=3*(t=t.replace(/[^A-Za-z0-9\+\/\=]/g,"")).length/4;if(t.charAt(t.length-1)===p.charAt(64)&&f--,t.charAt(t.length-2)===p.charAt(64)&&f--,f%1!=0)throw new Error("Invalid base64 input, bad content length.");for(l=d.uint8array?new Uint8Array(0|f):new Array(0|f);o<t.length;)e=p.indexOf(t.charAt(o++))<<2|(n=p.indexOf(t.charAt(o++)))>>4,r=(15&n)<<4|(s=p.indexOf(t.charAt(o++)))>>2,i=(3&s)<<6|(a=p.indexOf(t.charAt(o++))),l[h++]=e,64!==s&&(l[h++]=r),64!==a&&(l[h++]=i);return l};},{"./support":30,"./utils":32}],2:[function(t,e,r){var i=t("./external"),n=t("./stream/DataWorker"),s=t("./stream/Crc32Probe"),a=t("./stream/DataLengthProbe");function o(t,e,r,i,n){this.compressedSize=t,this.uncompressedSize=e,this.crc32=r,this.compression=i,this.compressedContent=n;}o.prototype={getContentWorker:function(){var t=new n(i.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new a("data_length")),e=this;return t.on("end",function(){if(this.streamInfo.data_length!==e.uncompressedSize)throw new Error("Bug : uncompressed data size mismatch")}),t},getCompressedWorker:function(){return new n(i.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize",this.compressedSize).withStreamInfo("uncompressedSize",this.uncompressedSize).withStreamInfo("crc32",this.crc32).withStreamInfo("compression",this.compression)}},o.createWorkerFrom=function(t,e,r){return t.pipe(new s).pipe(new a("uncompressedSize")).pipe(e.compressWorker(r)).pipe(new a("compressedSize")).withStreamInfo("compression",e)},e.exports=o;},{"./external":6,"./stream/Crc32Probe":25,"./stream/DataLengthProbe":26,"./stream/DataWorker":27}],3:[function(t,e,r){var i=t("./stream/GenericWorker");r.STORE={magic:"\0\0",compressWorker:function(t){return new i("STORE compression")},uncompressWorker:function(){return new i("STORE decompression")}},r.DEFLATE=t("./flate");},{"./flate":7,"./stream/GenericWorker":28}],4:[function(t,e,r){var i=t("./utils");var o=function(){for(var t,e=[],r=0;r<256;r++){t=r;for(var i=0;i<8;i++)t=1&t?3988292384^t>>>1:t>>>1;e[r]=t;}return e}();e.exports=function(t,e){return void 0!==t&&t.length?"string"!==i.getTypeOf(t)?function(t,e,r,i){var n=o,s=i+r;t^=-1;for(var a=i;a<s;a++)t=t>>>8^n[255&(t^e[a])];return -1^t}(0|e,t,t.length,0):function(t,e,r,i){var n=o,s=i+r;t^=-1;for(var a=i;a<s;a++)t=t>>>8^n[255&(t^e.charCodeAt(a))];return -1^t}(0|e,t,t.length,0):0};},{"./utils":32}],5:[function(t,e,r){r.base64=!1,r.binary=!1,r.dir=!1,r.createFolders=!0,r.date=null,r.compression=null,r.compressionOptions=null,r.comment=null,r.unixPermissions=null,r.dosPermissions=null;},{}],6:[function(t,e,r){var i=null;i="undefined"!=typeof Promise?Promise:t("lie"),e.exports={Promise:i};},{lie:37}],7:[function(t,e,r){var i="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Uint32Array,n=t("pako"),s=t("./utils"),a=t("./stream/GenericWorker"),o=i?"uint8array":"array";function h(t,e){a.call(this,"FlateWorker/"+t),this._pako=null,this._pakoAction=t,this._pakoOptions=e,this.meta={};}r.magic="\b\0",s.inherits(h,a),h.prototype.processChunk=function(t){this.meta=t.meta,null===this._pako&&this._createPako(),this._pako.push(s.transformTo(o,t.data),!1);},h.prototype.flush=function(){a.prototype.flush.call(this),null===this._pako&&this._createPako(),this._pako.push([],!0);},h.prototype.cleanUp=function(){a.prototype.cleanUp.call(this),this._pako=null;},h.prototype._createPako=function(){this._pako=new n[this._pakoAction]({raw:!0,level:this._pakoOptions.level||-1});var e=this;this._pako.onData=function(t){e.push({data:t,meta:e.meta});};},r.compressWorker=function(t){return new h("Deflate",t)},r.uncompressWorker=function(){return new h("Inflate",{})};},{"./stream/GenericWorker":28,"./utils":32,pako:38}],8:[function(t,e,r){function A(t,e){var r,i="";for(r=0;r<e;r++)i+=String.fromCharCode(255&t),t>>>=8;return i}function i(t,e,r,i,n,s){var a,o,h=t.file,u=t.compression,l=s!==O.utf8encode,f=I.transformTo("string",s(h.name)),d=I.transformTo("string",O.utf8encode(h.name)),c=h.comment,p=I.transformTo("string",s(c)),m=I.transformTo("string",O.utf8encode(c)),_=d.length!==h.name.length,g=m.length!==c.length,b="",v="",y="",w=h.dir,k=h.date,x={crc32:0,compressedSize:0,uncompressedSize:0};e&&!r||(x.crc32=t.crc32,x.compressedSize=t.compressedSize,x.uncompressedSize=t.uncompressedSize);var S=0;e&&(S|=8),l||!_&&!g||(S|=2048);var z=0,C=0;w&&(z|=16),"UNIX"===n?(C=798,z|=function(t,e){var r=t;return t||(r=e?16893:33204),(65535&r)<<16}(h.unixPermissions,w)):(C=20,z|=function(t){return 63&(t||0)}(h.dosPermissions)),a=k.getUTCHours(),a<<=6,a|=k.getUTCMinutes(),a<<=5,a|=k.getUTCSeconds()/2,o=k.getUTCFullYear()-1980,o<<=4,o|=k.getUTCMonth()+1,o<<=5,o|=k.getUTCDate(),_&&(v=A(1,1)+A(B(f),4)+d,b+="up"+A(v.length,2)+v),g&&(y=A(1,1)+A(B(p),4)+m,b+="uc"+A(y.length,2)+y);var E="";return E+="\n\0",E+=A(S,2),E+=u.magic,E+=A(a,2),E+=A(o,2),E+=A(x.crc32,4),E+=A(x.compressedSize,4),E+=A(x.uncompressedSize,4),E+=A(f.length,2),E+=A(b.length,2),{fileRecord:R.LOCAL_FILE_HEADER+E+f+b,dirRecord:R.CENTRAL_FILE_HEADER+A(C,2)+E+A(p.length,2)+"\0\0\0\0"+A(z,4)+A(i,4)+f+b+p}}var I=t("../utils"),n=t("../stream/GenericWorker"),O=t("../utf8"),B=t("../crc32"),R=t("../signature");function s(t,e,r,i){n.call(this,"ZipFileWorker"),this.bytesWritten=0,this.zipComment=e,this.zipPlatform=r,this.encodeFileName=i,this.streamFiles=t,this.accumulate=!1,this.contentBuffer=[],this.dirRecords=[],this.currentSourceOffset=0,this.entriesCount=0,this.currentFile=null,this._sources=[];}I.inherits(s,n),s.prototype.push=function(t){var e=t.meta.percent||0,r=this.entriesCount,i=this._sources.length;this.accumulate?this.contentBuffer.push(t):(this.bytesWritten+=t.data.length,n.prototype.push.call(this,{data:t.data,meta:{currentFile:this.currentFile,percent:r?(e+100*(r-i-1))/r:100}}));},s.prototype.openedSource=function(t){this.currentSourceOffset=this.bytesWritten,this.currentFile=t.file.name;var e=this.streamFiles&&!t.file.dir;if(e){var r=i(t,e,!1,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);this.push({data:r.fileRecord,meta:{percent:0}});}else this.accumulate=!0;},s.prototype.closedSource=function(t){this.accumulate=!1;var e=this.streamFiles&&!t.file.dir,r=i(t,e,!0,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);if(this.dirRecords.push(r.dirRecord),e)this.push({data:function(t){return R.DATA_DESCRIPTOR+A(t.crc32,4)+A(t.compressedSize,4)+A(t.uncompressedSize,4)}(t),meta:{percent:100}});else for(this.push({data:r.fileRecord,meta:{percent:0}});this.contentBuffer.length;)this.push(this.contentBuffer.shift());this.currentFile=null;},s.prototype.flush=function(){for(var t=this.bytesWritten,e=0;e<this.dirRecords.length;e++)this.push({data:this.dirRecords[e],meta:{percent:100}});var r=this.bytesWritten-t,i=function(t,e,r,i,n){var s=I.transformTo("string",n(i));return R.CENTRAL_DIRECTORY_END+"\0\0\0\0"+A(t,2)+A(t,2)+A(e,4)+A(r,4)+A(s.length,2)+s}(this.dirRecords.length,r,t,this.zipComment,this.encodeFileName);this.push({data:i,meta:{percent:100}});},s.prototype.prepareNextSource=function(){this.previous=this._sources.shift(),this.openedSource(this.previous.streamInfo),this.isPaused?this.previous.pause():this.previous.resume();},s.prototype.registerPrevious=function(t){this._sources.push(t);var e=this;return t.on("data",function(t){e.processChunk(t);}),t.on("end",function(){e.closedSource(e.previous.streamInfo),e._sources.length?e.prepareNextSource():e.end();}),t.on("error",function(t){e.error(t);}),this},s.prototype.resume=function(){return !!n.prototype.resume.call(this)&&(!this.previous&&this._sources.length?(this.prepareNextSource(),!0):this.previous||this._sources.length||this.generatedError?void 0:(this.end(),!0))},s.prototype.error=function(t){var e=this._sources;if(!n.prototype.error.call(this,t))return !1;for(var r=0;r<e.length;r++)try{e[r].error(t);}catch(t){}return !0},s.prototype.lock=function(){n.prototype.lock.call(this);for(var t=this._sources,e=0;e<t.length;e++)t[e].lock();},e.exports=s;},{"../crc32":4,"../signature":23,"../stream/GenericWorker":28,"../utf8":31,"../utils":32}],9:[function(t,e,r){var u=t("../compressions"),i=t("./ZipFileWorker");r.generateWorker=function(t,a,e){var o=new i(a.streamFiles,e,a.platform,a.encodeFileName),h=0;try{t.forEach(function(t,e){h++;var r=function(t,e){var r=t||e,i=u[r];if(!i)throw new Error(r+" is not a valid compression method !");return i}(e.options.compression,a.compression),i=e.options.compressionOptions||a.compressionOptions||{},n=e.dir,s=e.date;e._compressWorker(r,i).withStreamInfo("file",{name:t,dir:n,date:s,comment:e.comment||"",unixPermissions:e.unixPermissions,dosPermissions:e.dosPermissions}).pipe(o);}),o.entriesCount=h;}catch(t){o.error(t);}return o};},{"../compressions":3,"./ZipFileWorker":8}],10:[function(t,e,r){function i(){if(!(this instanceof i))return new i;if(arguments.length)throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");this.files=Object.create(null),this.comment=null,this.root="",this.clone=function(){var t=new i;for(var e in this)"function"!=typeof this[e]&&(t[e]=this[e]);return t};}(i.prototype=t("./object")).loadAsync=t("./load"),i.support=t("./support"),i.defaults=t("./defaults"),i.version="3.7.1",i.loadAsync=function(t,e){return (new i).loadAsync(t,e)},i.external=t("./external"),e.exports=i;},{"./defaults":5,"./external":6,"./load":11,"./object":15,"./support":30}],11:[function(t,e,r){var i=t("./utils"),n=t("./external"),o=t("./utf8"),h=t("./zipEntries"),s=t("./stream/Crc32Probe"),u=t("./nodejsUtils");function l(i){return new n.Promise(function(t,e){var r=i.decompressed.getContentWorker().pipe(new s);r.on("error",function(t){e(t);}).on("end",function(){r.streamInfo.crc32!==i.decompressed.crc32?e(new Error("Corrupted zip : CRC32 mismatch")):t();}).resume();})}e.exports=function(t,s){var a=this;return s=i.extend(s||{},{base64:!1,checkCRC32:!1,optimizedBinaryString:!1,createFolders:!1,decodeFileName:o.utf8decode}),u.isNode&&u.isStream(t)?n.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")):i.prepareContent("the loaded zip file",t,!0,s.optimizedBinaryString,s.base64).then(function(t){var e=new h(s);return e.load(t),e}).then(function(t){var e=[n.Promise.resolve(t)],r=t.files;if(s.checkCRC32)for(var i=0;i<r.length;i++)e.push(l(r[i]));return n.Promise.all(e)}).then(function(t){for(var e=t.shift(),r=e.files,i=0;i<r.length;i++){var n=r[i];a.file(n.fileNameStr,n.decompressed,{binary:!0,optimizedBinaryString:!0,date:n.date,dir:n.dir,comment:n.fileCommentStr.length?n.fileCommentStr:null,unixPermissions:n.unixPermissions,dosPermissions:n.dosPermissions,createFolders:s.createFolders});}return e.zipComment.length&&(a.comment=e.zipComment),a})};},{"./external":6,"./nodejsUtils":14,"./stream/Crc32Probe":25,"./utf8":31,"./utils":32,"./zipEntries":33}],12:[function(t,e,r){var i=t("../utils"),n=t("../stream/GenericWorker");function s(t,e){n.call(this,"Nodejs stream input adapter for "+t),this._upstreamEnded=!1,this._bindStream(e);}i.inherits(s,n),s.prototype._bindStream=function(t){var e=this;(this._stream=t).pause(),t.on("data",function(t){e.push({data:t,meta:{percent:0}});}).on("error",function(t){e.isPaused?this.generatedError=t:e.error(t);}).on("end",function(){e.isPaused?e._upstreamEnded=!0:e.end();});},s.prototype.pause=function(){return !!n.prototype.pause.call(this)&&(this._stream.pause(),!0)},s.prototype.resume=function(){return !!n.prototype.resume.call(this)&&(this._upstreamEnded?this.end():this._stream.resume(),!0)},e.exports=s;},{"../stream/GenericWorker":28,"../utils":32}],13:[function(t,e,r){var n=t("readable-stream").Readable;function i(t,e,r){n.call(this,e),this._helper=t;var i=this;t.on("data",function(t,e){i.push(t)||i._helper.pause(),r&&r(e);}).on("error",function(t){i.emit("error",t);}).on("end",function(){i.push(null);});}t("../utils").inherits(i,n),i.prototype._read=function(){this._helper.resume();},e.exports=i;},{"../utils":32,"readable-stream":16}],14:[function(t,e,r){e.exports={isNode:"undefined"!=typeof Buffer,newBufferFrom:function(t,e){if(Buffer.from&&Buffer.from!==Uint8Array.from)return Buffer.from(t,e);if("number"==typeof t)throw new Error('The "data" argument must not be a number');return new Buffer(t,e)},allocBuffer:function(t){if(Buffer.alloc)return Buffer.alloc(t);var e=new Buffer(t);return e.fill(0),e},isBuffer:function(t){return Buffer.isBuffer(t)},isStream:function(t){return t&&"function"==typeof t.on&&"function"==typeof t.pause&&"function"==typeof t.resume}};},{}],15:[function(t,e,r){function s(t,e,r){var i,n=u.getTypeOf(e),s=u.extend(r||{},f);s.date=s.date||new Date,null!==s.compression&&(s.compression=s.compression.toUpperCase()),"string"==typeof s.unixPermissions&&(s.unixPermissions=parseInt(s.unixPermissions,8)),s.unixPermissions&&16384&s.unixPermissions&&(s.dir=!0),s.dosPermissions&&16&s.dosPermissions&&(s.dir=!0),s.dir&&(t=g(t)),s.createFolders&&(i=_(t))&&b.call(this,i,!0);var a="string"===n&&!1===s.binary&&!1===s.base64;r&&void 0!==r.binary||(s.binary=!a),(e instanceof d&&0===e.uncompressedSize||s.dir||!e||0===e.length)&&(s.base64=!1,s.binary=!0,e="",s.compression="STORE",n="string");var o=null;o=e instanceof d||e instanceof l?e:p.isNode&&p.isStream(e)?new m(t,e):u.prepareContent(t,e,s.binary,s.optimizedBinaryString,s.base64);var h=new c(t,o,s);this.files[t]=h;}var n=t("./utf8"),u=t("./utils"),l=t("./stream/GenericWorker"),a=t("./stream/StreamHelper"),f=t("./defaults"),d=t("./compressedObject"),c=t("./zipObject"),o=t("./generate"),p=t("./nodejsUtils"),m=t("./nodejs/NodejsStreamInputAdapter"),_=function(t){"/"===t.slice(-1)&&(t=t.substring(0,t.length-1));var e=t.lastIndexOf("/");return 0<e?t.substring(0,e):""},g=function(t){return "/"!==t.slice(-1)&&(t+="/"),t},b=function(t,e){return e=void 0!==e?e:f.createFolders,t=g(t),this.files[t]||s.call(this,t,null,{dir:!0,createFolders:e}),this.files[t]};function h(t){return "[object RegExp]"===Object.prototype.toString.call(t)}var i={load:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},forEach:function(t){var e,r,i;for(e in this.files)i=this.files[e],(r=e.slice(this.root.length,e.length))&&e.slice(0,this.root.length)===this.root&&t(r,i);},filter:function(r){var i=[];return this.forEach(function(t,e){r(t,e)&&i.push(e);}),i},file:function(t,e,r){if(1!==arguments.length)return t=this.root+t,s.call(this,t,e,r),this;if(h(t)){var i=t;return this.filter(function(t,e){return !e.dir&&i.test(t)})}var n=this.files[this.root+t];return n&&!n.dir?n:null},folder:function(r){if(!r)return this;if(h(r))return this.filter(function(t,e){return e.dir&&r.test(t)});var t=this.root+r,e=b.call(this,t),i=this.clone();return i.root=e.name,i},remove:function(r){r=this.root+r;var t=this.files[r];if(t||("/"!==r.slice(-1)&&(r+="/"),t=this.files[r]),t&&!t.dir)delete this.files[r];else for(var e=this.filter(function(t,e){return e.name.slice(0,r.length)===r}),i=0;i<e.length;i++)delete this.files[e[i].name];return this},generate:function(t){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},generateInternalStream:function(t){var e,r={};try{if((r=u.extend(t||{},{streamFiles:!1,compression:"STORE",compressionOptions:null,type:"",platform:"DOS",comment:null,mimeType:"application/zip",encodeFileName:n.utf8encode})).type=r.type.toLowerCase(),r.compression=r.compression.toUpperCase(),"binarystring"===r.type&&(r.type="string"),!r.type)throw new Error("No output type specified.");u.checkSupport(r.type),"darwin"!==r.platform&&"freebsd"!==r.platform&&"linux"!==r.platform&&"sunos"!==r.platform||(r.platform="UNIX"),"win32"===r.platform&&(r.platform="DOS");var i=r.comment||this.comment||"";e=o.generateWorker(this,r,i);}catch(t){(e=new l("error")).error(t);}return new a(e,r.type||"string",r.mimeType)},generateAsync:function(t,e){return this.generateInternalStream(t).accumulate(e)},generateNodeStream:function(t,e){return (t=t||{}).type||(t.type="nodebuffer"),this.generateInternalStream(t).toNodejsStream(e)}};e.exports=i;},{"./compressedObject":2,"./defaults":5,"./generate":9,"./nodejs/NodejsStreamInputAdapter":12,"./nodejsUtils":14,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31,"./utils":32,"./zipObject":35}],16:[function(t,e,r){e.exports=t("stream");},{stream:void 0}],17:[function(t,e,r){var i=t("./DataReader");function n(t){i.call(this,t);for(var e=0;e<this.data.length;e++)t[e]=255&t[e];}t("../utils").inherits(n,i),n.prototype.byteAt=function(t){return this.data[this.zero+t]},n.prototype.lastIndexOfSignature=function(t){for(var e=t.charCodeAt(0),r=t.charCodeAt(1),i=t.charCodeAt(2),n=t.charCodeAt(3),s=this.length-4;0<=s;--s)if(this.data[s]===e&&this.data[s+1]===r&&this.data[s+2]===i&&this.data[s+3]===n)return s-this.zero;return -1},n.prototype.readAndCheckSignature=function(t){var e=t.charCodeAt(0),r=t.charCodeAt(1),i=t.charCodeAt(2),n=t.charCodeAt(3),s=this.readData(4);return e===s[0]&&r===s[1]&&i===s[2]&&n===s[3]},n.prototype.readData=function(t){if(this.checkOffset(t),0===t)return [];var e=this.data.slice(this.zero+this.index,this.zero+this.index+t);return this.index+=t,e},e.exports=n;},{"../utils":32,"./DataReader":18}],18:[function(t,e,r){var i=t("../utils");function n(t){this.data=t,this.length=t.length,this.index=0,this.zero=0;}n.prototype={checkOffset:function(t){this.checkIndex(this.index+t);},checkIndex:function(t){if(this.length<this.zero+t||t<0)throw new Error("End of data reached (data length = "+this.length+", asked index = "+t+"). Corrupted zip ?")},setIndex:function(t){this.checkIndex(t),this.index=t;},skip:function(t){this.setIndex(this.index+t);},byteAt:function(t){},readInt:function(t){var e,r=0;for(this.checkOffset(t),e=this.index+t-1;e>=this.index;e--)r=(r<<8)+this.byteAt(e);return this.index+=t,r},readString:function(t){return i.transformTo("string",this.readData(t))},readData:function(t){},lastIndexOfSignature:function(t){},readAndCheckSignature:function(t){},readDate:function(){var t=this.readInt(4);return new Date(Date.UTC(1980+(t>>25&127),(t>>21&15)-1,t>>16&31,t>>11&31,t>>5&63,(31&t)<<1))}},e.exports=n;},{"../utils":32}],19:[function(t,e,r){var i=t("./Uint8ArrayReader");function n(t){i.call(this,t);}t("../utils").inherits(n,i),n.prototype.readData=function(t){this.checkOffset(t);var e=this.data.slice(this.zero+this.index,this.zero+this.index+t);return this.index+=t,e},e.exports=n;},{"../utils":32,"./Uint8ArrayReader":21}],20:[function(t,e,r){var i=t("./DataReader");function n(t){i.call(this,t);}t("../utils").inherits(n,i),n.prototype.byteAt=function(t){return this.data.charCodeAt(this.zero+t)},n.prototype.lastIndexOfSignature=function(t){return this.data.lastIndexOf(t)-this.zero},n.prototype.readAndCheckSignature=function(t){return t===this.readData(4)},n.prototype.readData=function(t){this.checkOffset(t);var e=this.data.slice(this.zero+this.index,this.zero+this.index+t);return this.index+=t,e},e.exports=n;},{"../utils":32,"./DataReader":18}],21:[function(t,e,r){var i=t("./ArrayReader");function n(t){i.call(this,t);}t("../utils").inherits(n,i),n.prototype.readData=function(t){if(this.checkOffset(t),0===t)return new Uint8Array(0);var e=this.data.subarray(this.zero+this.index,this.zero+this.index+t);return this.index+=t,e},e.exports=n;},{"../utils":32,"./ArrayReader":17}],22:[function(t,e,r){var i=t("../utils"),n=t("../support"),s=t("./ArrayReader"),a=t("./StringReader"),o=t("./NodeBufferReader"),h=t("./Uint8ArrayReader");e.exports=function(t){var e=i.getTypeOf(t);return i.checkSupport(e),"string"!==e||n.uint8array?"nodebuffer"===e?new o(t):n.uint8array?new h(i.transformTo("uint8array",t)):new s(i.transformTo("array",t)):new a(t)};},{"../support":30,"../utils":32,"./ArrayReader":17,"./NodeBufferReader":19,"./StringReader":20,"./Uint8ArrayReader":21}],23:[function(t,e,r){r.LOCAL_FILE_HEADER="PK",r.CENTRAL_FILE_HEADER="PK",r.CENTRAL_DIRECTORY_END="PK",r.ZIP64_CENTRAL_DIRECTORY_LOCATOR="PK",r.ZIP64_CENTRAL_DIRECTORY_END="PK",r.DATA_DESCRIPTOR="PK\b";},{}],24:[function(t,e,r){var i=t("./GenericWorker"),n=t("../utils");function s(t){i.call(this,"ConvertWorker to "+t),this.destType=t;}n.inherits(s,i),s.prototype.processChunk=function(t){this.push({data:n.transformTo(this.destType,t.data),meta:t.meta});},e.exports=s;},{"../utils":32,"./GenericWorker":28}],25:[function(t,e,r){var i=t("./GenericWorker"),n=t("../crc32");function s(){i.call(this,"Crc32Probe"),this.withStreamInfo("crc32",0);}t("../utils").inherits(s,i),s.prototype.processChunk=function(t){this.streamInfo.crc32=n(t.data,this.streamInfo.crc32||0),this.push(t);},e.exports=s;},{"../crc32":4,"../utils":32,"./GenericWorker":28}],26:[function(t,e,r){var i=t("../utils"),n=t("./GenericWorker");function s(t){n.call(this,"DataLengthProbe for "+t),this.propName=t,this.withStreamInfo(t,0);}i.inherits(s,n),s.prototype.processChunk=function(t){if(t){var e=this.streamInfo[this.propName]||0;this.streamInfo[this.propName]=e+t.data.length;}n.prototype.processChunk.call(this,t);},e.exports=s;},{"../utils":32,"./GenericWorker":28}],27:[function(t,e,r){var i=t("../utils"),n=t("./GenericWorker");function s(t){n.call(this,"DataWorker");var e=this;this.dataIsReady=!1,this.index=0,this.max=0,this.data=null,this.type="",this._tickScheduled=!1,t.then(function(t){e.dataIsReady=!0,e.data=t,e.max=t&&t.length||0,e.type=i.getTypeOf(t),e.isPaused||e._tickAndRepeat();},function(t){e.error(t);});}i.inherits(s,n),s.prototype.cleanUp=function(){n.prototype.cleanUp.call(this),this.data=null;},s.prototype.resume=function(){return !!n.prototype.resume.call(this)&&(!this._tickScheduled&&this.dataIsReady&&(this._tickScheduled=!0,i.delay(this._tickAndRepeat,[],this)),!0)},s.prototype._tickAndRepeat=function(){this._tickScheduled=!1,this.isPaused||this.isFinished||(this._tick(),this.isFinished||(i.delay(this._tickAndRepeat,[],this),this._tickScheduled=!0));},s.prototype._tick=function(){if(this.isPaused||this.isFinished)return !1;var t=null,e=Math.min(this.max,this.index+16384);if(this.index>=this.max)return this.end();switch(this.type){case"string":t=this.data.substring(this.index,e);break;case"uint8array":t=this.data.subarray(this.index,e);break;case"array":case"nodebuffer":t=this.data.slice(this.index,e);}return this.index=e,this.push({data:t,meta:{percent:this.max?this.index/this.max*100:0}})},e.exports=s;},{"../utils":32,"./GenericWorker":28}],28:[function(t,e,r){function i(t){this.name=t||"default",this.streamInfo={},this.generatedError=null,this.extraStreamInfo={},this.isPaused=!0,this.isFinished=!1,this.isLocked=!1,this._listeners={data:[],end:[],error:[]},this.previous=null;}i.prototype={push:function(t){this.emit("data",t);},end:function(){if(this.isFinished)return !1;this.flush();try{this.emit("end"),this.cleanUp(),this.isFinished=!0;}catch(t){this.emit("error",t);}return !0},error:function(t){return !this.isFinished&&(this.isPaused?this.generatedError=t:(this.isFinished=!0,this.emit("error",t),this.previous&&this.previous.error(t),this.cleanUp()),!0)},on:function(t,e){return this._listeners[t].push(e),this},cleanUp:function(){this.streamInfo=this.generatedError=this.extraStreamInfo=null,this._listeners=[];},emit:function(t,e){if(this._listeners[t])for(var r=0;r<this._listeners[t].length;r++)this._listeners[t][r].call(this,e);},pipe:function(t){return t.registerPrevious(this)},registerPrevious:function(t){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.streamInfo=t.streamInfo,this.mergeStreamInfo(),this.previous=t;var e=this;return t.on("data",function(t){e.processChunk(t);}),t.on("end",function(){e.end();}),t.on("error",function(t){e.error(t);}),this},pause:function(){return !this.isPaused&&!this.isFinished&&(this.isPaused=!0,this.previous&&this.previous.pause(),!0)},resume:function(){if(!this.isPaused||this.isFinished)return !1;var t=this.isPaused=!1;return this.generatedError&&(this.error(this.generatedError),t=!0),this.previous&&this.previous.resume(),!t},flush:function(){},processChunk:function(t){this.push(t);},withStreamInfo:function(t,e){return this.extraStreamInfo[t]=e,this.mergeStreamInfo(),this},mergeStreamInfo:function(){for(var t in this.extraStreamInfo)this.extraStreamInfo.hasOwnProperty(t)&&(this.streamInfo[t]=this.extraStreamInfo[t]);},lock:function(){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.isLocked=!0,this.previous&&this.previous.lock();},toString:function(){var t="Worker "+this.name;return this.previous?this.previous+" -> "+t:t}},e.exports=i;},{}],29:[function(t,e,r){var h=t("../utils"),n=t("./ConvertWorker"),s=t("./GenericWorker"),u=t("../base64"),i=t("../support"),a=t("../external"),o=null;if(i.nodestream)try{o=t("../nodejs/NodejsStreamOutputAdapter");}catch(t){}function l(t,o){return new a.Promise(function(e,r){var i=[],n=t._internalType,s=t._outputType,a=t._mimeType;t.on("data",function(t,e){i.push(t),o&&o(e);}).on("error",function(t){i=[],r(t);}).on("end",function(){try{var t=function(t,e,r){switch(t){case"blob":return h.newBlob(h.transformTo("arraybuffer",e),r);case"base64":return u.encode(e);default:return h.transformTo(t,e)}}(s,function(t,e){var r,i=0,n=null,s=0;for(r=0;r<e.length;r++)s+=e[r].length;switch(t){case"string":return e.join("");case"array":return Array.prototype.concat.apply([],e);case"uint8array":for(n=new Uint8Array(s),r=0;r<e.length;r++)n.set(e[r],i),i+=e[r].length;return n;case"nodebuffer":return Buffer.concat(e);default:throw new Error("concat : unsupported type '"+t+"'")}}(n,i),a);e(t);}catch(t){r(t);}i=[];}).resume();})}function f(t,e,r){var i=e;switch(e){case"blob":case"arraybuffer":i="uint8array";break;case"base64":i="string";}try{this._internalType=i,this._outputType=e,this._mimeType=r,h.checkSupport(i),this._worker=t.pipe(new n(i)),t.lock();}catch(t){this._worker=new s("error"),this._worker.error(t);}}f.prototype={accumulate:function(t){return l(this,t)},on:function(t,e){var r=this;return "data"===t?this._worker.on(t,function(t){e.call(r,t.data,t.meta);}):this._worker.on(t,function(){h.delay(e,arguments,r);}),this},resume:function(){return h.delay(this._worker.resume,[],this._worker),this},pause:function(){return this._worker.pause(),this},toNodejsStream:function(t){if(h.checkSupport("nodestream"),"nodebuffer"!==this._outputType)throw new Error(this._outputType+" is not supported by this method");return new o(this,{objectMode:"nodebuffer"!==this._outputType},t)}},e.exports=f;},{"../base64":1,"../external":6,"../nodejs/NodejsStreamOutputAdapter":13,"../support":30,"../utils":32,"./ConvertWorker":24,"./GenericWorker":28}],30:[function(t,e,r){if(r.base64=!0,r.array=!0,r.string=!0,r.arraybuffer="undefined"!=typeof ArrayBuffer&&"undefined"!=typeof Uint8Array,r.nodebuffer="undefined"!=typeof Buffer,r.uint8array="undefined"!=typeof Uint8Array,"undefined"==typeof ArrayBuffer)r.blob=!1;else {var i=new ArrayBuffer(0);try{r.blob=0===new Blob([i],{type:"application/zip"}).size;}catch(t){try{var n=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);n.append(i),r.blob=0===n.getBlob("application/zip").size;}catch(t){r.blob=!1;}}}try{r.nodestream=!!t("readable-stream").Readable;}catch(t){r.nodestream=!1;}},{"readable-stream":16}],31:[function(t,e,s){for(var o=t("./utils"),h=t("./support"),r=t("./nodejsUtils"),i=t("./stream/GenericWorker"),u=new Array(256),n=0;n<256;n++)u[n]=252<=n?6:248<=n?5:240<=n?4:224<=n?3:192<=n?2:1;u[254]=u[254]=1;function a(){i.call(this,"utf-8 decode"),this.leftOver=null;}function l(){i.call(this,"utf-8 encode");}s.utf8encode=function(t){return h.nodebuffer?r.newBufferFrom(t,"utf-8"):function(t){var e,r,i,n,s,a=t.length,o=0;for(n=0;n<a;n++)55296==(64512&(r=t.charCodeAt(n)))&&n+1<a&&56320==(64512&(i=t.charCodeAt(n+1)))&&(r=65536+(r-55296<<10)+(i-56320),n++),o+=r<128?1:r<2048?2:r<65536?3:4;for(e=h.uint8array?new Uint8Array(o):new Array(o),n=s=0;s<o;n++)55296==(64512&(r=t.charCodeAt(n)))&&n+1<a&&56320==(64512&(i=t.charCodeAt(n+1)))&&(r=65536+(r-55296<<10)+(i-56320),n++),r<128?e[s++]=r:(r<2048?e[s++]=192|r>>>6:(r<65536?e[s++]=224|r>>>12:(e[s++]=240|r>>>18,e[s++]=128|r>>>12&63),e[s++]=128|r>>>6&63),e[s++]=128|63&r);return e}(t)},s.utf8decode=function(t){return h.nodebuffer?o.transformTo("nodebuffer",t).toString("utf-8"):function(t){var e,r,i,n,s=t.length,a=new Array(2*s);for(e=r=0;e<s;)if((i=t[e++])<128)a[r++]=i;else if(4<(n=u[i]))a[r++]=65533,e+=n-1;else {for(i&=2===n?31:3===n?15:7;1<n&&e<s;)i=i<<6|63&t[e++],n--;1<n?a[r++]=65533:i<65536?a[r++]=i:(i-=65536,a[r++]=55296|i>>10&1023,a[r++]=56320|1023&i);}return a.length!==r&&(a.subarray?a=a.subarray(0,r):a.length=r),o.applyFromCharCode(a)}(t=o.transformTo(h.uint8array?"uint8array":"array",t))},o.inherits(a,i),a.prototype.processChunk=function(t){var e=o.transformTo(h.uint8array?"uint8array":"array",t.data);if(this.leftOver&&this.leftOver.length){if(h.uint8array){var r=e;(e=new Uint8Array(r.length+this.leftOver.length)).set(this.leftOver,0),e.set(r,this.leftOver.length);}else e=this.leftOver.concat(e);this.leftOver=null;}var i=function(t,e){var r;for((e=e||t.length)>t.length&&(e=t.length),r=e-1;0<=r&&128==(192&t[r]);)r--;return r<0?e:0===r?e:r+u[t[r]]>e?r:e}(e),n=e;i!==e.length&&(h.uint8array?(n=e.subarray(0,i),this.leftOver=e.subarray(i,e.length)):(n=e.slice(0,i),this.leftOver=e.slice(i,e.length))),this.push({data:s.utf8decode(n),meta:t.meta});},a.prototype.flush=function(){this.leftOver&&this.leftOver.length&&(this.push({data:s.utf8decode(this.leftOver),meta:{}}),this.leftOver=null);},s.Utf8DecodeWorker=a,o.inherits(l,i),l.prototype.processChunk=function(t){this.push({data:s.utf8encode(t.data),meta:t.meta});},s.Utf8EncodeWorker=l;},{"./nodejsUtils":14,"./stream/GenericWorker":28,"./support":30,"./utils":32}],32:[function(t,e,a){var o=t("./support"),h=t("./base64"),r=t("./nodejsUtils"),i=t("set-immediate-shim"),u=t("./external");function n(t){return t}function l(t,e){for(var r=0;r<t.length;++r)e[r]=255&t.charCodeAt(r);return e}a.newBlob=function(e,r){a.checkSupport("blob");try{return new Blob([e],{type:r})}catch(t){try{var i=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);return i.append(e),i.getBlob(r)}catch(t){throw new Error("Bug : can't construct the Blob.")}}};var s={stringifyByChunk:function(t,e,r){var i=[],n=0,s=t.length;if(s<=r)return String.fromCharCode.apply(null,t);for(;n<s;)"array"===e||"nodebuffer"===e?i.push(String.fromCharCode.apply(null,t.slice(n,Math.min(n+r,s)))):i.push(String.fromCharCode.apply(null,t.subarray(n,Math.min(n+r,s)))),n+=r;return i.join("")},stringifyByChar:function(t){for(var e="",r=0;r<t.length;r++)e+=String.fromCharCode(t[r]);return e},applyCanBeUsed:{uint8array:function(){try{return o.uint8array&&1===String.fromCharCode.apply(null,new Uint8Array(1)).length}catch(t){return !1}}(),nodebuffer:function(){try{return o.nodebuffer&&1===String.fromCharCode.apply(null,r.allocBuffer(1)).length}catch(t){return !1}}()}};function f(t){var e=65536,r=a.getTypeOf(t),i=!0;if("uint8array"===r?i=s.applyCanBeUsed.uint8array:"nodebuffer"===r&&(i=s.applyCanBeUsed.nodebuffer),i)for(;1<e;)try{return s.stringifyByChunk(t,r,e)}catch(t){e=Math.floor(e/2);}return s.stringifyByChar(t)}function d(t,e){for(var r=0;r<t.length;r++)e[r]=t[r];return e}a.applyFromCharCode=f;var c={};c.string={string:n,array:function(t){return l(t,new Array(t.length))},arraybuffer:function(t){return c.string.uint8array(t).buffer},uint8array:function(t){return l(t,new Uint8Array(t.length))},nodebuffer:function(t){return l(t,r.allocBuffer(t.length))}},c.array={string:f,array:n,arraybuffer:function(t){return new Uint8Array(t).buffer},uint8array:function(t){return new Uint8Array(t)},nodebuffer:function(t){return r.newBufferFrom(t)}},c.arraybuffer={string:function(t){return f(new Uint8Array(t))},array:function(t){return d(new Uint8Array(t),new Array(t.byteLength))},arraybuffer:n,uint8array:function(t){return new Uint8Array(t)},nodebuffer:function(t){return r.newBufferFrom(new Uint8Array(t))}},c.uint8array={string:f,array:function(t){return d(t,new Array(t.length))},arraybuffer:function(t){return t.buffer},uint8array:n,nodebuffer:function(t){return r.newBufferFrom(t)}},c.nodebuffer={string:f,array:function(t){return d(t,new Array(t.length))},arraybuffer:function(t){return c.nodebuffer.uint8array(t).buffer},uint8array:function(t){return d(t,new Uint8Array(t.length))},nodebuffer:n},a.transformTo=function(t,e){if(e=e||"",!t)return e;a.checkSupport(t);var r=a.getTypeOf(e);return c[r][t](e)},a.getTypeOf=function(t){return "string"==typeof t?"string":"[object Array]"===Object.prototype.toString.call(t)?"array":o.nodebuffer&&r.isBuffer(t)?"nodebuffer":o.uint8array&&t instanceof Uint8Array?"uint8array":o.arraybuffer&&t instanceof ArrayBuffer?"arraybuffer":void 0},a.checkSupport=function(t){if(!o[t.toLowerCase()])throw new Error(t+" is not supported by this platform")},a.MAX_VALUE_16BITS=65535,a.MAX_VALUE_32BITS=-1,a.pretty=function(t){var e,r,i="";for(r=0;r<(t||"").length;r++)i+="\\x"+((e=t.charCodeAt(r))<16?"0":"")+e.toString(16).toUpperCase();return i},a.delay=function(t,e,r){i(function(){t.apply(r||null,e||[]);});},a.inherits=function(t,e){function r(){}r.prototype=e.prototype,t.prototype=new r;},a.extend=function(){var t,e,r={};for(t=0;t<arguments.length;t++)for(e in arguments[t])arguments[t].hasOwnProperty(e)&&void 0===r[e]&&(r[e]=arguments[t][e]);return r},a.prepareContent=function(r,t,i,n,s){return u.Promise.resolve(t).then(function(i){return o.blob&&(i instanceof Blob||-1!==["[object File]","[object Blob]"].indexOf(Object.prototype.toString.call(i)))&&"undefined"!=typeof FileReader?new u.Promise(function(e,r){var t=new FileReader;t.onload=function(t){e(t.target.result);},t.onerror=function(t){r(t.target.error);},t.readAsArrayBuffer(i);}):i}).then(function(t){var e=a.getTypeOf(t);return e?("arraybuffer"===e?t=a.transformTo("uint8array",t):"string"===e&&(s?t=h.decode(t):i&&!0!==n&&(t=function(t){return l(t,o.uint8array?new Uint8Array(t.length):new Array(t.length))}(t))),t):u.Promise.reject(new Error("Can't read the data of '"+r+"'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"))})};},{"./base64":1,"./external":6,"./nodejsUtils":14,"./support":30,"set-immediate-shim":54}],33:[function(t,e,r){var i=t("./reader/readerFor"),n=t("./utils"),s=t("./signature"),a=t("./zipEntry"),o=(t("./utf8"),t("./support"));function h(t){this.files=[],this.loadOptions=t;}h.prototype={checkSignature:function(t){if(!this.reader.readAndCheckSignature(t)){this.reader.index-=4;var e=this.reader.readString(4);throw new Error("Corrupted zip or bug: unexpected signature ("+n.pretty(e)+", expected "+n.pretty(t)+")")}},isSignature:function(t,e){var r=this.reader.index;this.reader.setIndex(t);var i=this.reader.readString(4)===e;return this.reader.setIndex(r),i},readBlockEndOfCentral:function(){this.diskNumber=this.reader.readInt(2),this.diskWithCentralDirStart=this.reader.readInt(2),this.centralDirRecordsOnThisDisk=this.reader.readInt(2),this.centralDirRecords=this.reader.readInt(2),this.centralDirSize=this.reader.readInt(4),this.centralDirOffset=this.reader.readInt(4),this.zipCommentLength=this.reader.readInt(2);var t=this.reader.readData(this.zipCommentLength),e=o.uint8array?"uint8array":"array",r=n.transformTo(e,t);this.zipComment=this.loadOptions.decodeFileName(r);},readBlockZip64EndOfCentral:function(){this.zip64EndOfCentralSize=this.reader.readInt(8),this.reader.skip(4),this.diskNumber=this.reader.readInt(4),this.diskWithCentralDirStart=this.reader.readInt(4),this.centralDirRecordsOnThisDisk=this.reader.readInt(8),this.centralDirRecords=this.reader.readInt(8),this.centralDirSize=this.reader.readInt(8),this.centralDirOffset=this.reader.readInt(8),this.zip64ExtensibleData={};for(var t,e,r,i=this.zip64EndOfCentralSize-44;0<i;)t=this.reader.readInt(2),e=this.reader.readInt(4),r=this.reader.readData(e),this.zip64ExtensibleData[t]={id:t,length:e,value:r};},readBlockZip64EndOfCentralLocator:function(){if(this.diskWithZip64CentralDirStart=this.reader.readInt(4),this.relativeOffsetEndOfZip64CentralDir=this.reader.readInt(8),this.disksCount=this.reader.readInt(4),1<this.disksCount)throw new Error("Multi-volumes zip are not supported")},readLocalFiles:function(){var t,e;for(t=0;t<this.files.length;t++)e=this.files[t],this.reader.setIndex(e.localHeaderOffset),this.checkSignature(s.LOCAL_FILE_HEADER),e.readLocalPart(this.reader),e.handleUTF8(),e.processAttributes();},readCentralDir:function(){var t;for(this.reader.setIndex(this.centralDirOffset);this.reader.readAndCheckSignature(s.CENTRAL_FILE_HEADER);)(t=new a({zip64:this.zip64},this.loadOptions)).readCentralPart(this.reader),this.files.push(t);if(this.centralDirRecords!==this.files.length&&0!==this.centralDirRecords&&0===this.files.length)throw new Error("Corrupted zip or bug: expected "+this.centralDirRecords+" records in central dir, got "+this.files.length)},readEndOfCentral:function(){var t=this.reader.lastIndexOfSignature(s.CENTRAL_DIRECTORY_END);if(t<0)throw !this.isSignature(0,s.LOCAL_FILE_HEADER)?new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html"):new Error("Corrupted zip: can't find end of central directory");this.reader.setIndex(t);var e=t;if(this.checkSignature(s.CENTRAL_DIRECTORY_END),this.readBlockEndOfCentral(),this.diskNumber===n.MAX_VALUE_16BITS||this.diskWithCentralDirStart===n.MAX_VALUE_16BITS||this.centralDirRecordsOnThisDisk===n.MAX_VALUE_16BITS||this.centralDirRecords===n.MAX_VALUE_16BITS||this.centralDirSize===n.MAX_VALUE_32BITS||this.centralDirOffset===n.MAX_VALUE_32BITS){if(this.zip64=!0,(t=this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR))<0)throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");if(this.reader.setIndex(t),this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR),this.readBlockZip64EndOfCentralLocator(),!this.isSignature(this.relativeOffsetEndOfZip64CentralDir,s.ZIP64_CENTRAL_DIRECTORY_END)&&(this.relativeOffsetEndOfZip64CentralDir=this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_END),this.relativeOffsetEndOfZip64CentralDir<0))throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir),this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_END),this.readBlockZip64EndOfCentral();}var r=this.centralDirOffset+this.centralDirSize;this.zip64&&(r+=20,r+=12+this.zip64EndOfCentralSize);var i=e-r;if(0<i)this.isSignature(e,s.CENTRAL_FILE_HEADER)||(this.reader.zero=i);else if(i<0)throw new Error("Corrupted zip: missing "+Math.abs(i)+" bytes.")},prepareReader:function(t){this.reader=i(t);},load:function(t){this.prepareReader(t),this.readEndOfCentral(),this.readCentralDir(),this.readLocalFiles();}},e.exports=h;},{"./reader/readerFor":22,"./signature":23,"./support":30,"./utf8":31,"./utils":32,"./zipEntry":34}],34:[function(t,e,r){var i=t("./reader/readerFor"),s=t("./utils"),n=t("./compressedObject"),a=t("./crc32"),o=t("./utf8"),h=t("./compressions"),u=t("./support");function l(t,e){this.options=t,this.loadOptions=e;}l.prototype={isEncrypted:function(){return 1==(1&this.bitFlag)},useUTF8:function(){return 2048==(2048&this.bitFlag)},readLocalPart:function(t){var e,r;if(t.skip(22),this.fileNameLength=t.readInt(2),r=t.readInt(2),this.fileName=t.readData(this.fileNameLength),t.skip(r),-1===this.compressedSize||-1===this.uncompressedSize)throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");if(null===(e=function(t){for(var e in h)if(h.hasOwnProperty(e)&&h[e].magic===t)return h[e];return null}(this.compressionMethod)))throw new Error("Corrupted zip : compression "+s.pretty(this.compressionMethod)+" unknown (inner file : "+s.transformTo("string",this.fileName)+")");this.decompressed=new n(this.compressedSize,this.uncompressedSize,this.crc32,e,t.readData(this.compressedSize));},readCentralPart:function(t){this.versionMadeBy=t.readInt(2),t.skip(2),this.bitFlag=t.readInt(2),this.compressionMethod=t.readString(2),this.date=t.readDate(),this.crc32=t.readInt(4),this.compressedSize=t.readInt(4),this.uncompressedSize=t.readInt(4);var e=t.readInt(2);if(this.extraFieldsLength=t.readInt(2),this.fileCommentLength=t.readInt(2),this.diskNumberStart=t.readInt(2),this.internalFileAttributes=t.readInt(2),this.externalFileAttributes=t.readInt(4),this.localHeaderOffset=t.readInt(4),this.isEncrypted())throw new Error("Encrypted zip are not supported");t.skip(e),this.readExtraFields(t),this.parseZIP64ExtraField(t),this.fileComment=t.readData(this.fileCommentLength);},processAttributes:function(){this.unixPermissions=null,this.dosPermissions=null;var t=this.versionMadeBy>>8;this.dir=!!(16&this.externalFileAttributes),0==t&&(this.dosPermissions=63&this.externalFileAttributes),3==t&&(this.unixPermissions=this.externalFileAttributes>>16&65535),this.dir||"/"!==this.fileNameStr.slice(-1)||(this.dir=!0);},parseZIP64ExtraField:function(t){if(this.extraFields[1]){var e=i(this.extraFields[1].value);this.uncompressedSize===s.MAX_VALUE_32BITS&&(this.uncompressedSize=e.readInt(8)),this.compressedSize===s.MAX_VALUE_32BITS&&(this.compressedSize=e.readInt(8)),this.localHeaderOffset===s.MAX_VALUE_32BITS&&(this.localHeaderOffset=e.readInt(8)),this.diskNumberStart===s.MAX_VALUE_32BITS&&(this.diskNumberStart=e.readInt(4));}},readExtraFields:function(t){var e,r,i,n=t.index+this.extraFieldsLength;for(this.extraFields||(this.extraFields={});t.index+4<n;)e=t.readInt(2),r=t.readInt(2),i=t.readData(r),this.extraFields[e]={id:e,length:r,value:i};t.setIndex(n);},handleUTF8:function(){var t=u.uint8array?"uint8array":"array";if(this.useUTF8())this.fileNameStr=o.utf8decode(this.fileName),this.fileCommentStr=o.utf8decode(this.fileComment);else {var e=this.findExtraFieldUnicodePath();if(null!==e)this.fileNameStr=e;else {var r=s.transformTo(t,this.fileName);this.fileNameStr=this.loadOptions.decodeFileName(r);}var i=this.findExtraFieldUnicodeComment();if(null!==i)this.fileCommentStr=i;else {var n=s.transformTo(t,this.fileComment);this.fileCommentStr=this.loadOptions.decodeFileName(n);}}},findExtraFieldUnicodePath:function(){var t=this.extraFields[28789];if(t){var e=i(t.value);return 1!==e.readInt(1)?null:a(this.fileName)!==e.readInt(4)?null:o.utf8decode(e.readData(t.length-5))}return null},findExtraFieldUnicodeComment:function(){var t=this.extraFields[25461];if(t){var e=i(t.value);return 1!==e.readInt(1)?null:a(this.fileComment)!==e.readInt(4)?null:o.utf8decode(e.readData(t.length-5))}return null}},e.exports=l;},{"./compressedObject":2,"./compressions":3,"./crc32":4,"./reader/readerFor":22,"./support":30,"./utf8":31,"./utils":32}],35:[function(t,e,r){function i(t,e,r){this.name=t,this.dir=r.dir,this.date=r.date,this.comment=r.comment,this.unixPermissions=r.unixPermissions,this.dosPermissions=r.dosPermissions,this._data=e,this._dataBinary=r.binary,this.options={compression:r.compression,compressionOptions:r.compressionOptions};}var s=t("./stream/StreamHelper"),n=t("./stream/DataWorker"),a=t("./utf8"),o=t("./compressedObject"),h=t("./stream/GenericWorker");i.prototype={internalStream:function(t){var e=null,r="string";try{if(!t)throw new Error("No output type specified.");var i="string"===(r=t.toLowerCase())||"text"===r;"binarystring"!==r&&"text"!==r||(r="string"),e=this._decompressWorker();var n=!this._dataBinary;n&&!i&&(e=e.pipe(new a.Utf8EncodeWorker)),!n&&i&&(e=e.pipe(new a.Utf8DecodeWorker));}catch(t){(e=new h("error")).error(t);}return new s(e,r,"")},async:function(t,e){return this.internalStream(t).accumulate(e)},nodeStream:function(t,e){return this.internalStream(t||"nodebuffer").toNodejsStream(e)},_compressWorker:function(t,e){if(this._data instanceof o&&this._data.compression.magic===t.magic)return this._data.getCompressedWorker();var r=this._decompressWorker();return this._dataBinary||(r=r.pipe(new a.Utf8EncodeWorker)),o.createWorkerFrom(r,t,e)},_decompressWorker:function(){return this._data instanceof o?this._data.getContentWorker():this._data instanceof h?this._data:new n(this._data)}};for(var u=["asText","asBinary","asNodeBuffer","asUint8Array","asArrayBuffer"],l=function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},f=0;f<u.length;f++)i.prototype[u[f]]=l;e.exports=i;},{"./compressedObject":2,"./stream/DataWorker":27,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31}],36:[function(t,l,e){(function(e){var r,i,t=e.MutationObserver||e.WebKitMutationObserver;if(t){var n=0,s=new t(u),a=e.document.createTextNode("");s.observe(a,{characterData:!0}),r=function(){a.data=n=++n%2;};}else if(e.setImmediate||void 0===e.MessageChannel)r="document"in e&&"onreadystatechange"in e.document.createElement("script")?function(){var t=e.document.createElement("script");t.onreadystatechange=function(){u(),t.onreadystatechange=null,t.parentNode.removeChild(t),t=null;},e.document.documentElement.appendChild(t);}:function(){setTimeout(u,0);};else {var o=new e.MessageChannel;o.port1.onmessage=u,r=function(){o.port2.postMessage(0);};}var h=[];function u(){var t,e;i=!0;for(var r=h.length;r;){for(e=h,h=[],t=-1;++t<r;)e[t]();r=h.length;}i=!1;}l.exports=function(t){1!==h.push(t)||i||r();};}).call(this,"undefined"!=typeof commonjsGlobal?commonjsGlobal:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{});},{}],37:[function(t,e,r){var n=t("immediate");function u(){}var l={},s=["REJECTED"],a=["FULFILLED"],i=["PENDING"];function o(t){if("function"!=typeof t)throw new TypeError("resolver must be a function");this.state=i,this.queue=[],this.outcome=void 0,t!==u&&c(this,t);}function h(t,e,r){this.promise=t,"function"==typeof e&&(this.onFulfilled=e,this.callFulfilled=this.otherCallFulfilled),"function"==typeof r&&(this.onRejected=r,this.callRejected=this.otherCallRejected);}function f(e,r,i){n(function(){var t;try{t=r(i);}catch(t){return l.reject(e,t)}t===e?l.reject(e,new TypeError("Cannot resolve promise with itself")):l.resolve(e,t);});}function d(t){var e=t&&t.then;if(t&&("object"==typeof t||"function"==typeof t)&&"function"==typeof e)return function(){e.apply(t,arguments);}}function c(e,t){var r=!1;function i(t){r||(r=!0,l.reject(e,t));}function n(t){r||(r=!0,l.resolve(e,t));}var s=p(function(){t(n,i);});"error"===s.status&&i(s.value);}function p(t,e){var r={};try{r.value=t(e),r.status="success";}catch(t){r.status="error",r.value=t;}return r}(e.exports=o).prototype.finally=function(e){if("function"!=typeof e)return this;var r=this.constructor;return this.then(function(t){return r.resolve(e()).then(function(){return t})},function(t){return r.resolve(e()).then(function(){throw t})})},o.prototype.catch=function(t){return this.then(null,t)},o.prototype.then=function(t,e){if("function"!=typeof t&&this.state===a||"function"!=typeof e&&this.state===s)return this;var r=new this.constructor(u);this.state!==i?f(r,this.state===a?t:e,this.outcome):this.queue.push(new h(r,t,e));return r},h.prototype.callFulfilled=function(t){l.resolve(this.promise,t);},h.prototype.otherCallFulfilled=function(t){f(this.promise,this.onFulfilled,t);},h.prototype.callRejected=function(t){l.reject(this.promise,t);},h.prototype.otherCallRejected=function(t){f(this.promise,this.onRejected,t);},l.resolve=function(t,e){var r=p(d,e);if("error"===r.status)return l.reject(t,r.value);var i=r.value;if(i)c(t,i);else {t.state=a,t.outcome=e;for(var n=-1,s=t.queue.length;++n<s;)t.queue[n].callFulfilled(e);}return t},l.reject=function(t,e){t.state=s,t.outcome=e;for(var r=-1,i=t.queue.length;++r<i;)t.queue[r].callRejected(e);return t},o.resolve=function(t){if(t instanceof this)return t;return l.resolve(new this(u),t)},o.reject=function(t){var e=new this(u);return l.reject(e,t)},o.all=function(t){var r=this;if("[object Array]"!==Object.prototype.toString.call(t))return this.reject(new TypeError("must be an array"));var i=t.length,n=!1;if(!i)return this.resolve([]);var s=new Array(i),a=0,e=-1,o=new this(u);for(;++e<i;)h(t[e],e);return o;function h(t,e){r.resolve(t).then(function(t){s[e]=t,++a!==i||n||(n=!0,l.resolve(o,s));},function(t){n||(n=!0,l.reject(o,t));});}},o.race=function(t){var e=this;if("[object Array]"!==Object.prototype.toString.call(t))return this.reject(new TypeError("must be an array"));var r=t.length,i=!1;if(!r)return this.resolve([]);var n=-1,s=new this(u);for(;++n<r;)a=t[n],e.resolve(a).then(function(t){i||(i=!0,l.resolve(s,t));},function(t){i||(i=!0,l.reject(s,t));});var a;return s};},{immediate:36}],38:[function(t,e,r){var i={};(0, t("./lib/utils/common").assign)(i,t("./lib/deflate"),t("./lib/inflate"),t("./lib/zlib/constants")),e.exports=i;},{"./lib/deflate":39,"./lib/inflate":40,"./lib/utils/common":41,"./lib/zlib/constants":44}],39:[function(t,e,r){var a=t("./zlib/deflate"),o=t("./utils/common"),h=t("./utils/strings"),n=t("./zlib/messages"),s=t("./zlib/zstream"),u=Object.prototype.toString,l=0,f=-1,d=0,c=8;function p(t){if(!(this instanceof p))return new p(t);this.options=o.assign({level:f,method:c,chunkSize:16384,windowBits:15,memLevel:8,strategy:d,to:""},t||{});var e=this.options;e.raw&&0<e.windowBits?e.windowBits=-e.windowBits:e.gzip&&0<e.windowBits&&e.windowBits<16&&(e.windowBits+=16),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new s,this.strm.avail_out=0;var r=a.deflateInit2(this.strm,e.level,e.method,e.windowBits,e.memLevel,e.strategy);if(r!==l)throw new Error(n[r]);if(e.header&&a.deflateSetHeader(this.strm,e.header),e.dictionary){var i;if(i="string"==typeof e.dictionary?h.string2buf(e.dictionary):"[object ArrayBuffer]"===u.call(e.dictionary)?new Uint8Array(e.dictionary):e.dictionary,(r=a.deflateSetDictionary(this.strm,i))!==l)throw new Error(n[r]);this._dict_set=!0;}}function i(t,e){var r=new p(e);if(r.push(t,!0),r.err)throw r.msg||n[r.err];return r.result}p.prototype.push=function(t,e){var r,i,n=this.strm,s=this.options.chunkSize;if(this.ended)return !1;i=e===~~e?e:!0===e?4:0,"string"==typeof t?n.input=h.string2buf(t):"[object ArrayBuffer]"===u.call(t)?n.input=new Uint8Array(t):n.input=t,n.next_in=0,n.avail_in=n.input.length;do{if(0===n.avail_out&&(n.output=new o.Buf8(s),n.next_out=0,n.avail_out=s),1!==(r=a.deflate(n,i))&&r!==l)return this.onEnd(r),!(this.ended=!0);0!==n.avail_out&&(0!==n.avail_in||4!==i&&2!==i)||("string"===this.options.to?this.onData(h.buf2binstring(o.shrinkBuf(n.output,n.next_out))):this.onData(o.shrinkBuf(n.output,n.next_out)));}while((0<n.avail_in||0===n.avail_out)&&1!==r);return 4===i?(r=a.deflateEnd(this.strm),this.onEnd(r),this.ended=!0,r===l):2!==i||(this.onEnd(l),!(n.avail_out=0))},p.prototype.onData=function(t){this.chunks.push(t);},p.prototype.onEnd=function(t){t===l&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=o.flattenChunks(this.chunks)),this.chunks=[],this.err=t,this.msg=this.strm.msg;},r.Deflate=p,r.deflate=i,r.deflateRaw=function(t,e){return (e=e||{}).raw=!0,i(t,e)},r.gzip=function(t,e){return (e=e||{}).gzip=!0,i(t,e)};},{"./utils/common":41,"./utils/strings":42,"./zlib/deflate":46,"./zlib/messages":51,"./zlib/zstream":53}],40:[function(t,e,r){var d=t("./zlib/inflate"),c=t("./utils/common"),p=t("./utils/strings"),m=t("./zlib/constants"),i=t("./zlib/messages"),n=t("./zlib/zstream"),s=t("./zlib/gzheader"),_=Object.prototype.toString;function a(t){if(!(this instanceof a))return new a(t);this.options=c.assign({chunkSize:16384,windowBits:0,to:""},t||{});var e=this.options;e.raw&&0<=e.windowBits&&e.windowBits<16&&(e.windowBits=-e.windowBits,0===e.windowBits&&(e.windowBits=-15)),!(0<=e.windowBits&&e.windowBits<16)||t&&t.windowBits||(e.windowBits+=32),15<e.windowBits&&e.windowBits<48&&0==(15&e.windowBits)&&(e.windowBits|=15),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new n,this.strm.avail_out=0;var r=d.inflateInit2(this.strm,e.windowBits);if(r!==m.Z_OK)throw new Error(i[r]);this.header=new s,d.inflateGetHeader(this.strm,this.header);}function o(t,e){var r=new a(e);if(r.push(t,!0),r.err)throw r.msg||i[r.err];return r.result}a.prototype.push=function(t,e){var r,i,n,s,a,o,h=this.strm,u=this.options.chunkSize,l=this.options.dictionary,f=!1;if(this.ended)return !1;i=e===~~e?e:!0===e?m.Z_FINISH:m.Z_NO_FLUSH,"string"==typeof t?h.input=p.binstring2buf(t):"[object ArrayBuffer]"===_.call(t)?h.input=new Uint8Array(t):h.input=t,h.next_in=0,h.avail_in=h.input.length;do{if(0===h.avail_out&&(h.output=new c.Buf8(u),h.next_out=0,h.avail_out=u),(r=d.inflate(h,m.Z_NO_FLUSH))===m.Z_NEED_DICT&&l&&(o="string"==typeof l?p.string2buf(l):"[object ArrayBuffer]"===_.call(l)?new Uint8Array(l):l,r=d.inflateSetDictionary(this.strm,o)),r===m.Z_BUF_ERROR&&!0===f&&(r=m.Z_OK,f=!1),r!==m.Z_STREAM_END&&r!==m.Z_OK)return this.onEnd(r),!(this.ended=!0);h.next_out&&(0!==h.avail_out&&r!==m.Z_STREAM_END&&(0!==h.avail_in||i!==m.Z_FINISH&&i!==m.Z_SYNC_FLUSH)||("string"===this.options.to?(n=p.utf8border(h.output,h.next_out),s=h.next_out-n,a=p.buf2string(h.output,n),h.next_out=s,h.avail_out=u-s,s&&c.arraySet(h.output,h.output,n,s,0),this.onData(a)):this.onData(c.shrinkBuf(h.output,h.next_out)))),0===h.avail_in&&0===h.avail_out&&(f=!0);}while((0<h.avail_in||0===h.avail_out)&&r!==m.Z_STREAM_END);return r===m.Z_STREAM_END&&(i=m.Z_FINISH),i===m.Z_FINISH?(r=d.inflateEnd(this.strm),this.onEnd(r),this.ended=!0,r===m.Z_OK):i!==m.Z_SYNC_FLUSH||(this.onEnd(m.Z_OK),!(h.avail_out=0))},a.prototype.onData=function(t){this.chunks.push(t);},a.prototype.onEnd=function(t){t===m.Z_OK&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=c.flattenChunks(this.chunks)),this.chunks=[],this.err=t,this.msg=this.strm.msg;},r.Inflate=a,r.inflate=o,r.inflateRaw=function(t,e){return (e=e||{}).raw=!0,o(t,e)},r.ungzip=o;},{"./utils/common":41,"./utils/strings":42,"./zlib/constants":44,"./zlib/gzheader":47,"./zlib/inflate":49,"./zlib/messages":51,"./zlib/zstream":53}],41:[function(t,e,r){var i="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Int32Array;r.assign=function(t){for(var e=Array.prototype.slice.call(arguments,1);e.length;){var r=e.shift();if(r){if("object"!=typeof r)throw new TypeError(r+"must be non-object");for(var i in r)r.hasOwnProperty(i)&&(t[i]=r[i]);}}return t},r.shrinkBuf=function(t,e){return t.length===e?t:t.subarray?t.subarray(0,e):(t.length=e,t)};var n={arraySet:function(t,e,r,i,n){if(e.subarray&&t.subarray)t.set(e.subarray(r,r+i),n);else for(var s=0;s<i;s++)t[n+s]=e[r+s];},flattenChunks:function(t){var e,r,i,n,s,a;for(e=i=0,r=t.length;e<r;e++)i+=t[e].length;for(a=new Uint8Array(i),e=n=0,r=t.length;e<r;e++)s=t[e],a.set(s,n),n+=s.length;return a}},s={arraySet:function(t,e,r,i,n){for(var s=0;s<i;s++)t[n+s]=e[r+s];},flattenChunks:function(t){return [].concat.apply([],t)}};r.setTyped=function(t){t?(r.Buf8=Uint8Array,r.Buf16=Uint16Array,r.Buf32=Int32Array,r.assign(r,n)):(r.Buf8=Array,r.Buf16=Array,r.Buf32=Array,r.assign(r,s));},r.setTyped(i);},{}],42:[function(t,e,r){var h=t("./common"),n=!0,s=!0;try{String.fromCharCode.apply(null,[0]);}catch(t){n=!1;}try{String.fromCharCode.apply(null,new Uint8Array(1));}catch(t){s=!1;}for(var u=new h.Buf8(256),i=0;i<256;i++)u[i]=252<=i?6:248<=i?5:240<=i?4:224<=i?3:192<=i?2:1;function l(t,e){if(e<65537&&(t.subarray&&s||!t.subarray&&n))return String.fromCharCode.apply(null,h.shrinkBuf(t,e));for(var r="",i=0;i<e;i++)r+=String.fromCharCode(t[i]);return r}u[254]=u[254]=1,r.string2buf=function(t){var e,r,i,n,s,a=t.length,o=0;for(n=0;n<a;n++)55296==(64512&(r=t.charCodeAt(n)))&&n+1<a&&56320==(64512&(i=t.charCodeAt(n+1)))&&(r=65536+(r-55296<<10)+(i-56320),n++),o+=r<128?1:r<2048?2:r<65536?3:4;for(e=new h.Buf8(o),n=s=0;s<o;n++)55296==(64512&(r=t.charCodeAt(n)))&&n+1<a&&56320==(64512&(i=t.charCodeAt(n+1)))&&(r=65536+(r-55296<<10)+(i-56320),n++),r<128?e[s++]=r:(r<2048?e[s++]=192|r>>>6:(r<65536?e[s++]=224|r>>>12:(e[s++]=240|r>>>18,e[s++]=128|r>>>12&63),e[s++]=128|r>>>6&63),e[s++]=128|63&r);return e},r.buf2binstring=function(t){return l(t,t.length)},r.binstring2buf=function(t){for(var e=new h.Buf8(t.length),r=0,i=e.length;r<i;r++)e[r]=t.charCodeAt(r);return e},r.buf2string=function(t,e){var r,i,n,s,a=e||t.length,o=new Array(2*a);for(r=i=0;r<a;)if((n=t[r++])<128)o[i++]=n;else if(4<(s=u[n]))o[i++]=65533,r+=s-1;else {for(n&=2===s?31:3===s?15:7;1<s&&r<a;)n=n<<6|63&t[r++],s--;1<s?o[i++]=65533:n<65536?o[i++]=n:(n-=65536,o[i++]=55296|n>>10&1023,o[i++]=56320|1023&n);}return l(o,i)},r.utf8border=function(t,e){var r;for((e=e||t.length)>t.length&&(e=t.length),r=e-1;0<=r&&128==(192&t[r]);)r--;return r<0?e:0===r?e:r+u[t[r]]>e?r:e};},{"./common":41}],43:[function(t,e,r){e.exports=function(t,e,r,i){for(var n=65535&t|0,s=t>>>16&65535|0,a=0;0!==r;){for(r-=a=2e3<r?2e3:r;s=s+(n=n+e[i++]|0)|0,--a;);n%=65521,s%=65521;}return n|s<<16|0};},{}],44:[function(t,e,r){e.exports={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8};},{}],45:[function(t,e,r){var o=function(){for(var t,e=[],r=0;r<256;r++){t=r;for(var i=0;i<8;i++)t=1&t?3988292384^t>>>1:t>>>1;e[r]=t;}return e}();e.exports=function(t,e,r,i){var n=o,s=i+r;t^=-1;for(var a=i;a<s;a++)t=t>>>8^n[255&(t^e[a])];return -1^t};},{}],46:[function(t,e,r){var h,d=t("../utils/common"),u=t("./trees"),c=t("./adler32"),p=t("./crc32"),i=t("./messages"),l=0,f=4,m=0,_=-2,g=-1,b=4,n=2,v=8,y=9,s=286,a=30,o=19,w=2*s+1,k=15,x=3,S=258,z=S+x+1,C=42,E=113,A=1,I=2,O=3,B=4;function R(t,e){return t.msg=i[e],e}function T(t){return (t<<1)-(4<t?9:0)}function D(t){for(var e=t.length;0<=--e;)t[e]=0;}function F(t){var e=t.state,r=e.pending;r>t.avail_out&&(r=t.avail_out),0!==r&&(d.arraySet(t.output,e.pending_buf,e.pending_out,r,t.next_out),t.next_out+=r,e.pending_out+=r,t.total_out+=r,t.avail_out-=r,e.pending-=r,0===e.pending&&(e.pending_out=0));}function N(t,e){u._tr_flush_block(t,0<=t.block_start?t.block_start:-1,t.strstart-t.block_start,e),t.block_start=t.strstart,F(t.strm);}function U(t,e){t.pending_buf[t.pending++]=e;}function P(t,e){t.pending_buf[t.pending++]=e>>>8&255,t.pending_buf[t.pending++]=255&e;}function L(t,e){var r,i,n=t.max_chain_length,s=t.strstart,a=t.prev_length,o=t.nice_match,h=t.strstart>t.w_size-z?t.strstart-(t.w_size-z):0,u=t.window,l=t.w_mask,f=t.prev,d=t.strstart+S,c=u[s+a-1],p=u[s+a];t.prev_length>=t.good_match&&(n>>=2),o>t.lookahead&&(o=t.lookahead);do{if(u[(r=e)+a]===p&&u[r+a-1]===c&&u[r]===u[s]&&u[++r]===u[s+1]){s+=2,r++;do{}while(u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&s<d);if(i=S-(d-s),s=d-S,a<i){if(t.match_start=e,o<=(a=i))break;c=u[s+a-1],p=u[s+a];}}}while((e=f[e&l])>h&&0!=--n);return a<=t.lookahead?a:t.lookahead}function j(t){var e,r,i,n,s,a,o,h,u,l,f=t.w_size;do{if(n=t.window_size-t.lookahead-t.strstart,t.strstart>=f+(f-z)){for(d.arraySet(t.window,t.window,f,f,0),t.match_start-=f,t.strstart-=f,t.block_start-=f,e=r=t.hash_size;i=t.head[--e],t.head[e]=f<=i?i-f:0,--r;);for(e=r=f;i=t.prev[--e],t.prev[e]=f<=i?i-f:0,--r;);n+=f;}if(0===t.strm.avail_in)break;if(a=t.strm,o=t.window,h=t.strstart+t.lookahead,u=n,l=void 0,l=a.avail_in,u<l&&(l=u),r=0===l?0:(a.avail_in-=l,d.arraySet(o,a.input,a.next_in,l,h),1===a.state.wrap?a.adler=c(a.adler,o,l,h):2===a.state.wrap&&(a.adler=p(a.adler,o,l,h)),a.next_in+=l,a.total_in+=l,l),t.lookahead+=r,t.lookahead+t.insert>=x)for(s=t.strstart-t.insert,t.ins_h=t.window[s],t.ins_h=(t.ins_h<<t.hash_shift^t.window[s+1])&t.hash_mask;t.insert&&(t.ins_h=(t.ins_h<<t.hash_shift^t.window[s+x-1])&t.hash_mask,t.prev[s&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=s,s++,t.insert--,!(t.lookahead+t.insert<x)););}while(t.lookahead<z&&0!==t.strm.avail_in)}function Z(t,e){for(var r,i;;){if(t.lookahead<z){if(j(t),t.lookahead<z&&e===l)return A;if(0===t.lookahead)break}if(r=0,t.lookahead>=x&&(t.ins_h=(t.ins_h<<t.hash_shift^t.window[t.strstart+x-1])&t.hash_mask,r=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart),0!==r&&t.strstart-r<=t.w_size-z&&(t.match_length=L(t,r)),t.match_length>=x)if(i=u._tr_tally(t,t.strstart-t.match_start,t.match_length-x),t.lookahead-=t.match_length,t.match_length<=t.max_lazy_match&&t.lookahead>=x){for(t.match_length--;t.strstart++,t.ins_h=(t.ins_h<<t.hash_shift^t.window[t.strstart+x-1])&t.hash_mask,r=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart,0!=--t.match_length;);t.strstart++;}else t.strstart+=t.match_length,t.match_length=0,t.ins_h=t.window[t.strstart],t.ins_h=(t.ins_h<<t.hash_shift^t.window[t.strstart+1])&t.hash_mask;else i=u._tr_tally(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++;if(i&&(N(t,!1),0===t.strm.avail_out))return A}return t.insert=t.strstart<x-1?t.strstart:x-1,e===f?(N(t,!0),0===t.strm.avail_out?O:B):t.last_lit&&(N(t,!1),0===t.strm.avail_out)?A:I}function W(t,e){for(var r,i,n;;){if(t.lookahead<z){if(j(t),t.lookahead<z&&e===l)return A;if(0===t.lookahead)break}if(r=0,t.lookahead>=x&&(t.ins_h=(t.ins_h<<t.hash_shift^t.window[t.strstart+x-1])&t.hash_mask,r=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart),t.prev_length=t.match_length,t.prev_match=t.match_start,t.match_length=x-1,0!==r&&t.prev_length<t.max_lazy_match&&t.strstart-r<=t.w_size-z&&(t.match_length=L(t,r),t.match_length<=5&&(1===t.strategy||t.match_length===x&&4096<t.strstart-t.match_start)&&(t.match_length=x-1)),t.prev_length>=x&&t.match_length<=t.prev_length){for(n=t.strstart+t.lookahead-x,i=u._tr_tally(t,t.strstart-1-t.prev_match,t.prev_length-x),t.lookahead-=t.prev_length-1,t.prev_length-=2;++t.strstart<=n&&(t.ins_h=(t.ins_h<<t.hash_shift^t.window[t.strstart+x-1])&t.hash_mask,r=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart),0!=--t.prev_length;);if(t.match_available=0,t.match_length=x-1,t.strstart++,i&&(N(t,!1),0===t.strm.avail_out))return A}else if(t.match_available){if((i=u._tr_tally(t,0,t.window[t.strstart-1]))&&N(t,!1),t.strstart++,t.lookahead--,0===t.strm.avail_out)return A}else t.match_available=1,t.strstart++,t.lookahead--;}return t.match_available&&(i=u._tr_tally(t,0,t.window[t.strstart-1]),t.match_available=0),t.insert=t.strstart<x-1?t.strstart:x-1,e===f?(N(t,!0),0===t.strm.avail_out?O:B):t.last_lit&&(N(t,!1),0===t.strm.avail_out)?A:I}function M(t,e,r,i,n){this.good_length=t,this.max_lazy=e,this.nice_length=r,this.max_chain=i,this.func=n;}function H(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=v,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new d.Buf16(2*w),this.dyn_dtree=new d.Buf16(2*(2*a+1)),this.bl_tree=new d.Buf16(2*(2*o+1)),D(this.dyn_ltree),D(this.dyn_dtree),D(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new d.Buf16(k+1),this.heap=new d.Buf16(2*s+1),D(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new d.Buf16(2*s+1),D(this.depth),this.l_buf=0,this.lit_bufsize=0,this.last_lit=0,this.d_buf=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0;}function G(t){var e;return t&&t.state?(t.total_in=t.total_out=0,t.data_type=n,(e=t.state).pending=0,e.pending_out=0,e.wrap<0&&(e.wrap=-e.wrap),e.status=e.wrap?C:E,t.adler=2===e.wrap?0:1,e.last_flush=l,u._tr_init(e),m):R(t,_)}function K(t){var e=G(t);return e===m&&function(t){t.window_size=2*t.w_size,D(t.head),t.max_lazy_match=h[t.level].max_lazy,t.good_match=h[t.level].good_length,t.nice_match=h[t.level].nice_length,t.max_chain_length=h[t.level].max_chain,t.strstart=0,t.block_start=0,t.lookahead=0,t.insert=0,t.match_length=t.prev_length=x-1,t.match_available=0,t.ins_h=0;}(t.state),e}function Y(t,e,r,i,n,s){if(!t)return _;var a=1;if(e===g&&(e=6),i<0?(a=0,i=-i):15<i&&(a=2,i-=16),n<1||y<n||r!==v||i<8||15<i||e<0||9<e||s<0||b<s)return R(t,_);8===i&&(i=9);var o=new H;return (t.state=o).strm=t,o.wrap=a,o.gzhead=null,o.w_bits=i,o.w_size=1<<o.w_bits,o.w_mask=o.w_size-1,o.hash_bits=n+7,o.hash_size=1<<o.hash_bits,o.hash_mask=o.hash_size-1,o.hash_shift=~~((o.hash_bits+x-1)/x),o.window=new d.Buf8(2*o.w_size),o.head=new d.Buf16(o.hash_size),o.prev=new d.Buf16(o.w_size),o.lit_bufsize=1<<n+6,o.pending_buf_size=4*o.lit_bufsize,o.pending_buf=new d.Buf8(o.pending_buf_size),o.d_buf=1*o.lit_bufsize,o.l_buf=3*o.lit_bufsize,o.level=e,o.strategy=s,o.method=r,K(t)}h=[new M(0,0,0,0,function(t,e){var r=65535;for(r>t.pending_buf_size-5&&(r=t.pending_buf_size-5);;){if(t.lookahead<=1){if(j(t),0===t.lookahead&&e===l)return A;if(0===t.lookahead)break}t.strstart+=t.lookahead,t.lookahead=0;var i=t.block_start+r;if((0===t.strstart||t.strstart>=i)&&(t.lookahead=t.strstart-i,t.strstart=i,N(t,!1),0===t.strm.avail_out))return A;if(t.strstart-t.block_start>=t.w_size-z&&(N(t,!1),0===t.strm.avail_out))return A}return t.insert=0,e===f?(N(t,!0),0===t.strm.avail_out?O:B):(t.strstart>t.block_start&&(N(t,!1),t.strm.avail_out),A)}),new M(4,4,8,4,Z),new M(4,5,16,8,Z),new M(4,6,32,32,Z),new M(4,4,16,16,W),new M(8,16,32,32,W),new M(8,16,128,128,W),new M(8,32,128,256,W),new M(32,128,258,1024,W),new M(32,258,258,4096,W)],r.deflateInit=function(t,e){return Y(t,e,v,15,8,0)},r.deflateInit2=Y,r.deflateReset=K,r.deflateResetKeep=G,r.deflateSetHeader=function(t,e){return t&&t.state?2!==t.state.wrap?_:(t.state.gzhead=e,m):_},r.deflate=function(t,e){var r,i,n,s;if(!t||!t.state||5<e||e<0)return t?R(t,_):_;if(i=t.state,!t.output||!t.input&&0!==t.avail_in||666===i.status&&e!==f)return R(t,0===t.avail_out?-5:_);if(i.strm=t,r=i.last_flush,i.last_flush=e,i.status===C)if(2===i.wrap)t.adler=0,U(i,31),U(i,139),U(i,8),i.gzhead?(U(i,(i.gzhead.text?1:0)+(i.gzhead.hcrc?2:0)+(i.gzhead.extra?4:0)+(i.gzhead.name?8:0)+(i.gzhead.comment?16:0)),U(i,255&i.gzhead.time),U(i,i.gzhead.time>>8&255),U(i,i.gzhead.time>>16&255),U(i,i.gzhead.time>>24&255),U(i,9===i.level?2:2<=i.strategy||i.level<2?4:0),U(i,255&i.gzhead.os),i.gzhead.extra&&i.gzhead.extra.length&&(U(i,255&i.gzhead.extra.length),U(i,i.gzhead.extra.length>>8&255)),i.gzhead.hcrc&&(t.adler=p(t.adler,i.pending_buf,i.pending,0)),i.gzindex=0,i.status=69):(U(i,0),U(i,0),U(i,0),U(i,0),U(i,0),U(i,9===i.level?2:2<=i.strategy||i.level<2?4:0),U(i,3),i.status=E);else {var a=v+(i.w_bits-8<<4)<<8;a|=(2<=i.strategy||i.level<2?0:i.level<6?1:6===i.level?2:3)<<6,0!==i.strstart&&(a|=32),a+=31-a%31,i.status=E,P(i,a),0!==i.strstart&&(P(i,t.adler>>>16),P(i,65535&t.adler)),t.adler=1;}if(69===i.status)if(i.gzhead.extra){for(n=i.pending;i.gzindex<(65535&i.gzhead.extra.length)&&(i.pending!==i.pending_buf_size||(i.gzhead.hcrc&&i.pending>n&&(t.adler=p(t.adler,i.pending_buf,i.pending-n,n)),F(t),n=i.pending,i.pending!==i.pending_buf_size));)U(i,255&i.gzhead.extra[i.gzindex]),i.gzindex++;i.gzhead.hcrc&&i.pending>n&&(t.adler=p(t.adler,i.pending_buf,i.pending-n,n)),i.gzindex===i.gzhead.extra.length&&(i.gzindex=0,i.status=73);}else i.status=73;if(73===i.status)if(i.gzhead.name){n=i.pending;do{if(i.pending===i.pending_buf_size&&(i.gzhead.hcrc&&i.pending>n&&(t.adler=p(t.adler,i.pending_buf,i.pending-n,n)),F(t),n=i.pending,i.pending===i.pending_buf_size)){s=1;break}s=i.gzindex<i.gzhead.name.length?255&i.gzhead.name.charCodeAt(i.gzindex++):0,U(i,s);}while(0!==s);i.gzhead.hcrc&&i.pending>n&&(t.adler=p(t.adler,i.pending_buf,i.pending-n,n)),0===s&&(i.gzindex=0,i.status=91);}else i.status=91;if(91===i.status)if(i.gzhead.comment){n=i.pending;do{if(i.pending===i.pending_buf_size&&(i.gzhead.hcrc&&i.pending>n&&(t.adler=p(t.adler,i.pending_buf,i.pending-n,n)),F(t),n=i.pending,i.pending===i.pending_buf_size)){s=1;break}s=i.gzindex<i.gzhead.comment.length?255&i.gzhead.comment.charCodeAt(i.gzindex++):0,U(i,s);}while(0!==s);i.gzhead.hcrc&&i.pending>n&&(t.adler=p(t.adler,i.pending_buf,i.pending-n,n)),0===s&&(i.status=103);}else i.status=103;if(103===i.status&&(i.gzhead.hcrc?(i.pending+2>i.pending_buf_size&&F(t),i.pending+2<=i.pending_buf_size&&(U(i,255&t.adler),U(i,t.adler>>8&255),t.adler=0,i.status=E)):i.status=E),0!==i.pending){if(F(t),0===t.avail_out)return i.last_flush=-1,m}else if(0===t.avail_in&&T(e)<=T(r)&&e!==f)return R(t,-5);if(666===i.status&&0!==t.avail_in)return R(t,-5);if(0!==t.avail_in||0!==i.lookahead||e!==l&&666!==i.status){var o=2===i.strategy?function(t,e){for(var r;;){if(0===t.lookahead&&(j(t),0===t.lookahead)){if(e===l)return A;break}if(t.match_length=0,r=u._tr_tally(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++,r&&(N(t,!1),0===t.strm.avail_out))return A}return t.insert=0,e===f?(N(t,!0),0===t.strm.avail_out?O:B):t.last_lit&&(N(t,!1),0===t.strm.avail_out)?A:I}(i,e):3===i.strategy?function(t,e){for(var r,i,n,s,a=t.window;;){if(t.lookahead<=S){if(j(t),t.lookahead<=S&&e===l)return A;if(0===t.lookahead)break}if(t.match_length=0,t.lookahead>=x&&0<t.strstart&&(i=a[n=t.strstart-1])===a[++n]&&i===a[++n]&&i===a[++n]){s=t.strstart+S;do{}while(i===a[++n]&&i===a[++n]&&i===a[++n]&&i===a[++n]&&i===a[++n]&&i===a[++n]&&i===a[++n]&&i===a[++n]&&n<s);t.match_length=S-(s-n),t.match_length>t.lookahead&&(t.match_length=t.lookahead);}if(t.match_length>=x?(r=u._tr_tally(t,1,t.match_length-x),t.lookahead-=t.match_length,t.strstart+=t.match_length,t.match_length=0):(r=u._tr_tally(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++),r&&(N(t,!1),0===t.strm.avail_out))return A}return t.insert=0,e===f?(N(t,!0),0===t.strm.avail_out?O:B):t.last_lit&&(N(t,!1),0===t.strm.avail_out)?A:I}(i,e):h[i.level].func(i,e);if(o!==O&&o!==B||(i.status=666),o===A||o===O)return 0===t.avail_out&&(i.last_flush=-1),m;if(o===I&&(1===e?u._tr_align(i):5!==e&&(u._tr_stored_block(i,0,0,!1),3===e&&(D(i.head),0===i.lookahead&&(i.strstart=0,i.block_start=0,i.insert=0))),F(t),0===t.avail_out))return i.last_flush=-1,m}return e!==f?m:i.wrap<=0?1:(2===i.wrap?(U(i,255&t.adler),U(i,t.adler>>8&255),U(i,t.adler>>16&255),U(i,t.adler>>24&255),U(i,255&t.total_in),U(i,t.total_in>>8&255),U(i,t.total_in>>16&255),U(i,t.total_in>>24&255)):(P(i,t.adler>>>16),P(i,65535&t.adler)),F(t),0<i.wrap&&(i.wrap=-i.wrap),0!==i.pending?m:1)},r.deflateEnd=function(t){var e;return t&&t.state?(e=t.state.status)!==C&&69!==e&&73!==e&&91!==e&&103!==e&&e!==E&&666!==e?R(t,_):(t.state=null,e===E?R(t,-3):m):_},r.deflateSetDictionary=function(t,e){var r,i,n,s,a,o,h,u,l=e.length;if(!t||!t.state)return _;if(2===(s=(r=t.state).wrap)||1===s&&r.status!==C||r.lookahead)return _;for(1===s&&(t.adler=c(t.adler,e,l,0)),r.wrap=0,l>=r.w_size&&(0===s&&(D(r.head),r.strstart=0,r.block_start=0,r.insert=0),u=new d.Buf8(r.w_size),d.arraySet(u,e,l-r.w_size,r.w_size,0),e=u,l=r.w_size),a=t.avail_in,o=t.next_in,h=t.input,t.avail_in=l,t.next_in=0,t.input=e,j(r);r.lookahead>=x;){for(i=r.strstart,n=r.lookahead-(x-1);r.ins_h=(r.ins_h<<r.hash_shift^r.window[i+x-1])&r.hash_mask,r.prev[i&r.w_mask]=r.head[r.ins_h],r.head[r.ins_h]=i,i++,--n;);r.strstart=i,r.lookahead=x-1,j(r);}return r.strstart+=r.lookahead,r.block_start=r.strstart,r.insert=r.lookahead,r.lookahead=0,r.match_length=r.prev_length=x-1,r.match_available=0,t.next_in=o,t.input=h,t.avail_in=a,r.wrap=s,m},r.deflateInfo="pako deflate (from Nodeca project)";},{"../utils/common":41,"./adler32":43,"./crc32":45,"./messages":51,"./trees":52}],47:[function(t,e,r){e.exports=function(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1;};},{}],48:[function(t,e,r){e.exports=function(t,e){var r,i,n,s,a,o,h,u,l,f,d,c,p,m,_,g,b,v,y,w,k,x,S,z,C;r=t.state,i=t.next_in,z=t.input,n=i+(t.avail_in-5),s=t.next_out,C=t.output,a=s-(e-t.avail_out),o=s+(t.avail_out-257),h=r.dmax,u=r.wsize,l=r.whave,f=r.wnext,d=r.window,c=r.hold,p=r.bits,m=r.lencode,_=r.distcode,g=(1<<r.lenbits)-1,b=(1<<r.distbits)-1;t:do{p<15&&(c+=z[i++]<<p,p+=8,c+=z[i++]<<p,p+=8),v=m[c&g];e:for(;;){if(c>>>=y=v>>>24,p-=y,0===(y=v>>>16&255))C[s++]=65535&v;else {if(!(16&y)){if(0==(64&y)){v=m[(65535&v)+(c&(1<<y)-1)];continue e}if(32&y){r.mode=12;break t}t.msg="invalid literal/length code",r.mode=30;break t}w=65535&v,(y&=15)&&(p<y&&(c+=z[i++]<<p,p+=8),w+=c&(1<<y)-1,c>>>=y,p-=y),p<15&&(c+=z[i++]<<p,p+=8,c+=z[i++]<<p,p+=8),v=_[c&b];r:for(;;){if(c>>>=y=v>>>24,p-=y,!(16&(y=v>>>16&255))){if(0==(64&y)){v=_[(65535&v)+(c&(1<<y)-1)];continue r}t.msg="invalid distance code",r.mode=30;break t}if(k=65535&v,p<(y&=15)&&(c+=z[i++]<<p,(p+=8)<y&&(c+=z[i++]<<p,p+=8)),h<(k+=c&(1<<y)-1)){t.msg="invalid distance too far back",r.mode=30;break t}if(c>>>=y,p-=y,(y=s-a)<k){if(l<(y=k-y)&&r.sane){t.msg="invalid distance too far back",r.mode=30;break t}if(S=d,(x=0)===f){if(x+=u-y,y<w){for(w-=y;C[s++]=d[x++],--y;);x=s-k,S=C;}}else if(f<y){if(x+=u+f-y,(y-=f)<w){for(w-=y;C[s++]=d[x++],--y;);if(x=0,f<w){for(w-=y=f;C[s++]=d[x++],--y;);x=s-k,S=C;}}}else if(x+=f-y,y<w){for(w-=y;C[s++]=d[x++],--y;);x=s-k,S=C;}for(;2<w;)C[s++]=S[x++],C[s++]=S[x++],C[s++]=S[x++],w-=3;w&&(C[s++]=S[x++],1<w&&(C[s++]=S[x++]));}else {for(x=s-k;C[s++]=C[x++],C[s++]=C[x++],C[s++]=C[x++],2<(w-=3););w&&(C[s++]=C[x++],1<w&&(C[s++]=C[x++]));}break}}break}}while(i<n&&s<o);i-=w=p>>3,c&=(1<<(p-=w<<3))-1,t.next_in=i,t.next_out=s,t.avail_in=i<n?n-i+5:5-(i-n),t.avail_out=s<o?o-s+257:257-(s-o),r.hold=c,r.bits=p;};},{}],49:[function(t,e,r){var I=t("../utils/common"),O=t("./adler32"),B=t("./crc32"),R=t("./inffast"),T=t("./inftrees"),D=1,F=2,N=0,U=-2,P=1,i=852,n=592;function L(t){return (t>>>24&255)+(t>>>8&65280)+((65280&t)<<8)+((255&t)<<24)}function s(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new I.Buf16(320),this.work=new I.Buf16(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0;}function a(t){var e;return t&&t.state?(e=t.state,t.total_in=t.total_out=e.total=0,t.msg="",e.wrap&&(t.adler=1&e.wrap),e.mode=P,e.last=0,e.havedict=0,e.dmax=32768,e.head=null,e.hold=0,e.bits=0,e.lencode=e.lendyn=new I.Buf32(i),e.distcode=e.distdyn=new I.Buf32(n),e.sane=1,e.back=-1,N):U}function o(t){var e;return t&&t.state?((e=t.state).wsize=0,e.whave=0,e.wnext=0,a(t)):U}function h(t,e){var r,i;return t&&t.state?(i=t.state,e<0?(r=0,e=-e):(r=1+(e>>4),e<48&&(e&=15)),e&&(e<8||15<e)?U:(null!==i.window&&i.wbits!==e&&(i.window=null),i.wrap=r,i.wbits=e,o(t))):U}function u(t,e){var r,i;return t?(i=new s,(t.state=i).window=null,(r=h(t,e))!==N&&(t.state=null),r):U}var l,f,d=!0;function j(t){if(d){var e;for(l=new I.Buf32(512),f=new I.Buf32(32),e=0;e<144;)t.lens[e++]=8;for(;e<256;)t.lens[e++]=9;for(;e<280;)t.lens[e++]=7;for(;e<288;)t.lens[e++]=8;for(T(D,t.lens,0,288,l,0,t.work,{bits:9}),e=0;e<32;)t.lens[e++]=5;T(F,t.lens,0,32,f,0,t.work,{bits:5}),d=!1;}t.lencode=l,t.lenbits=9,t.distcode=f,t.distbits=5;}function Z(t,e,r,i){var n,s=t.state;return null===s.window&&(s.wsize=1<<s.wbits,s.wnext=0,s.whave=0,s.window=new I.Buf8(s.wsize)),i>=s.wsize?(I.arraySet(s.window,e,r-s.wsize,s.wsize,0),s.wnext=0,s.whave=s.wsize):(i<(n=s.wsize-s.wnext)&&(n=i),I.arraySet(s.window,e,r-i,n,s.wnext),(i-=n)?(I.arraySet(s.window,e,r-i,i,0),s.wnext=i,s.whave=s.wsize):(s.wnext+=n,s.wnext===s.wsize&&(s.wnext=0),s.whave<s.wsize&&(s.whave+=n))),0}r.inflateReset=o,r.inflateReset2=h,r.inflateResetKeep=a,r.inflateInit=function(t){return u(t,15)},r.inflateInit2=u,r.inflate=function(t,e){var r,i,n,s,a,o,h,u,l,f,d,c,p,m,_,g,b,v,y,w,k,x,S,z,C=0,E=new I.Buf8(4),A=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];if(!t||!t.state||!t.output||!t.input&&0!==t.avail_in)return U;12===(r=t.state).mode&&(r.mode=13),a=t.next_out,n=t.output,h=t.avail_out,s=t.next_in,i=t.input,o=t.avail_in,u=r.hold,l=r.bits,f=o,d=h,x=N;t:for(;;)switch(r.mode){case P:if(0===r.wrap){r.mode=13;break}for(;l<16;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8;}if(2&r.wrap&&35615===u){E[r.check=0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0),l=u=0,r.mode=2;break}if(r.flags=0,r.head&&(r.head.done=!1),!(1&r.wrap)||(((255&u)<<8)+(u>>8))%31){t.msg="incorrect header check",r.mode=30;break}if(8!=(15&u)){t.msg="unknown compression method",r.mode=30;break}if(l-=4,k=8+(15&(u>>>=4)),0===r.wbits)r.wbits=k;else if(k>r.wbits){t.msg="invalid window size",r.mode=30;break}r.dmax=1<<k,t.adler=r.check=1,r.mode=512&u?10:12,l=u=0;break;case 2:for(;l<16;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8;}if(r.flags=u,8!=(255&r.flags)){t.msg="unknown compression method",r.mode=30;break}if(57344&r.flags){t.msg="unknown header flags set",r.mode=30;break}r.head&&(r.head.text=u>>8&1),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0,r.mode=3;case 3:for(;l<32;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8;}r.head&&(r.head.time=u),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,E[2]=u>>>16&255,E[3]=u>>>24&255,r.check=B(r.check,E,4,0)),l=u=0,r.mode=4;case 4:for(;l<16;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8;}r.head&&(r.head.xflags=255&u,r.head.os=u>>8),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0,r.mode=5;case 5:if(1024&r.flags){for(;l<16;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8;}r.length=u,r.head&&(r.head.extra_len=u),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0;}else r.head&&(r.head.extra=null);r.mode=6;case 6:if(1024&r.flags&&(o<(c=r.length)&&(c=o),c&&(r.head&&(k=r.head.extra_len-r.length,r.head.extra||(r.head.extra=new Array(r.head.extra_len)),I.arraySet(r.head.extra,i,s,c,k)),512&r.flags&&(r.check=B(r.check,i,c,s)),o-=c,s+=c,r.length-=c),r.length))break t;r.length=0,r.mode=7;case 7:if(2048&r.flags){if(0===o)break t;for(c=0;k=i[s+c++],r.head&&k&&r.length<65536&&(r.head.name+=String.fromCharCode(k)),k&&c<o;);if(512&r.flags&&(r.check=B(r.check,i,c,s)),o-=c,s+=c,k)break t}else r.head&&(r.head.name=null);r.length=0,r.mode=8;case 8:if(4096&r.flags){if(0===o)break t;for(c=0;k=i[s+c++],r.head&&k&&r.length<65536&&(r.head.comment+=String.fromCharCode(k)),k&&c<o;);if(512&r.flags&&(r.check=B(r.check,i,c,s)),o-=c,s+=c,k)break t}else r.head&&(r.head.comment=null);r.mode=9;case 9:if(512&r.flags){for(;l<16;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8;}if(u!==(65535&r.check)){t.msg="header crc mismatch",r.mode=30;break}l=u=0;}r.head&&(r.head.hcrc=r.flags>>9&1,r.head.done=!0),t.adler=r.check=0,r.mode=12;break;case 10:for(;l<32;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8;}t.adler=r.check=L(u),l=u=0,r.mode=11;case 11:if(0===r.havedict)return t.next_out=a,t.avail_out=h,t.next_in=s,t.avail_in=o,r.hold=u,r.bits=l,2;t.adler=r.check=1,r.mode=12;case 12:if(5===e||6===e)break t;case 13:if(r.last){u>>>=7&l,l-=7&l,r.mode=27;break}for(;l<3;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8;}switch(r.last=1&u,l-=1,3&(u>>>=1)){case 0:r.mode=14;break;case 1:if(j(r),r.mode=20,6!==e)break;u>>>=2,l-=2;break t;case 2:r.mode=17;break;case 3:t.msg="invalid block type",r.mode=30;}u>>>=2,l-=2;break;case 14:for(u>>>=7&l,l-=7&l;l<32;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8;}if((65535&u)!=(u>>>16^65535)){t.msg="invalid stored block lengths",r.mode=30;break}if(r.length=65535&u,l=u=0,r.mode=15,6===e)break t;case 15:r.mode=16;case 16:if(c=r.length){if(o<c&&(c=o),h<c&&(c=h),0===c)break t;I.arraySet(n,i,s,c,a),o-=c,s+=c,h-=c,a+=c,r.length-=c;break}r.mode=12;break;case 17:for(;l<14;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8;}if(r.nlen=257+(31&u),u>>>=5,l-=5,r.ndist=1+(31&u),u>>>=5,l-=5,r.ncode=4+(15&u),u>>>=4,l-=4,286<r.nlen||30<r.ndist){t.msg="too many length or distance symbols",r.mode=30;break}r.have=0,r.mode=18;case 18:for(;r.have<r.ncode;){for(;l<3;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8;}r.lens[A[r.have++]]=7&u,u>>>=3,l-=3;}for(;r.have<19;)r.lens[A[r.have++]]=0;if(r.lencode=r.lendyn,r.lenbits=7,S={bits:r.lenbits},x=T(0,r.lens,0,19,r.lencode,0,r.work,S),r.lenbits=S.bits,x){t.msg="invalid code lengths set",r.mode=30;break}r.have=0,r.mode=19;case 19:for(;r.have<r.nlen+r.ndist;){for(;g=(C=r.lencode[u&(1<<r.lenbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break t;o--,u+=i[s++]<<l,l+=8;}if(b<16)u>>>=_,l-=_,r.lens[r.have++]=b;else {if(16===b){for(z=_+2;l<z;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8;}if(u>>>=_,l-=_,0===r.have){t.msg="invalid bit length repeat",r.mode=30;break}k=r.lens[r.have-1],c=3+(3&u),u>>>=2,l-=2;}else if(17===b){for(z=_+3;l<z;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8;}l-=_,k=0,c=3+(7&(u>>>=_)),u>>>=3,l-=3;}else {for(z=_+7;l<z;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8;}l-=_,k=0,c=11+(127&(u>>>=_)),u>>>=7,l-=7;}if(r.have+c>r.nlen+r.ndist){t.msg="invalid bit length repeat",r.mode=30;break}for(;c--;)r.lens[r.have++]=k;}}if(30===r.mode)break;if(0===r.lens[256]){t.msg="invalid code -- missing end-of-block",r.mode=30;break}if(r.lenbits=9,S={bits:r.lenbits},x=T(D,r.lens,0,r.nlen,r.lencode,0,r.work,S),r.lenbits=S.bits,x){t.msg="invalid literal/lengths set",r.mode=30;break}if(r.distbits=6,r.distcode=r.distdyn,S={bits:r.distbits},x=T(F,r.lens,r.nlen,r.ndist,r.distcode,0,r.work,S),r.distbits=S.bits,x){t.msg="invalid distances set",r.mode=30;break}if(r.mode=20,6===e)break t;case 20:r.mode=21;case 21:if(6<=o&&258<=h){t.next_out=a,t.avail_out=h,t.next_in=s,t.avail_in=o,r.hold=u,r.bits=l,R(t,d),a=t.next_out,n=t.output,h=t.avail_out,s=t.next_in,i=t.input,o=t.avail_in,u=r.hold,l=r.bits,12===r.mode&&(r.back=-1);break}for(r.back=0;g=(C=r.lencode[u&(1<<r.lenbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break t;o--,u+=i[s++]<<l,l+=8;}if(g&&0==(240&g)){for(v=_,y=g,w=b;g=(C=r.lencode[w+((u&(1<<v+y)-1)>>v)])>>>16&255,b=65535&C,!(v+(_=C>>>24)<=l);){if(0===o)break t;o--,u+=i[s++]<<l,l+=8;}u>>>=v,l-=v,r.back+=v;}if(u>>>=_,l-=_,r.back+=_,r.length=b,0===g){r.mode=26;break}if(32&g){r.back=-1,r.mode=12;break}if(64&g){t.msg="invalid literal/length code",r.mode=30;break}r.extra=15&g,r.mode=22;case 22:if(r.extra){for(z=r.extra;l<z;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8;}r.length+=u&(1<<r.extra)-1,u>>>=r.extra,l-=r.extra,r.back+=r.extra;}r.was=r.length,r.mode=23;case 23:for(;g=(C=r.distcode[u&(1<<r.distbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break t;o--,u+=i[s++]<<l,l+=8;}if(0==(240&g)){for(v=_,y=g,w=b;g=(C=r.distcode[w+((u&(1<<v+y)-1)>>v)])>>>16&255,b=65535&C,!(v+(_=C>>>24)<=l);){if(0===o)break t;o--,u+=i[s++]<<l,l+=8;}u>>>=v,l-=v,r.back+=v;}if(u>>>=_,l-=_,r.back+=_,64&g){t.msg="invalid distance code",r.mode=30;break}r.offset=b,r.extra=15&g,r.mode=24;case 24:if(r.extra){for(z=r.extra;l<z;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8;}r.offset+=u&(1<<r.extra)-1,u>>>=r.extra,l-=r.extra,r.back+=r.extra;}if(r.offset>r.dmax){t.msg="invalid distance too far back",r.mode=30;break}r.mode=25;case 25:if(0===h)break t;if(c=d-h,r.offset>c){if((c=r.offset-c)>r.whave&&r.sane){t.msg="invalid distance too far back",r.mode=30;break}p=c>r.wnext?(c-=r.wnext,r.wsize-c):r.wnext-c,c>r.length&&(c=r.length),m=r.window;}else m=n,p=a-r.offset,c=r.length;for(h<c&&(c=h),h-=c,r.length-=c;n[a++]=m[p++],--c;);0===r.length&&(r.mode=21);break;case 26:if(0===h)break t;n[a++]=r.length,h--,r.mode=21;break;case 27:if(r.wrap){for(;l<32;){if(0===o)break t;o--,u|=i[s++]<<l,l+=8;}if(d-=h,t.total_out+=d,r.total+=d,d&&(t.adler=r.check=r.flags?B(r.check,n,d,a-d):O(r.check,n,d,a-d)),d=h,(r.flags?u:L(u))!==r.check){t.msg="incorrect data check",r.mode=30;break}l=u=0;}r.mode=28;case 28:if(r.wrap&&r.flags){for(;l<32;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8;}if(u!==(4294967295&r.total)){t.msg="incorrect length check",r.mode=30;break}l=u=0;}r.mode=29;case 29:x=1;break t;case 30:x=-3;break t;case 31:return -4;case 32:default:return U}return t.next_out=a,t.avail_out=h,t.next_in=s,t.avail_in=o,r.hold=u,r.bits=l,(r.wsize||d!==t.avail_out&&r.mode<30&&(r.mode<27||4!==e))&&Z(t,t.output,t.next_out,d-t.avail_out)?(r.mode=31,-4):(f-=t.avail_in,d-=t.avail_out,t.total_in+=f,t.total_out+=d,r.total+=d,r.wrap&&d&&(t.adler=r.check=r.flags?B(r.check,n,d,t.next_out-d):O(r.check,n,d,t.next_out-d)),t.data_type=r.bits+(r.last?64:0)+(12===r.mode?128:0)+(20===r.mode||15===r.mode?256:0),(0==f&&0===d||4===e)&&x===N&&(x=-5),x)},r.inflateEnd=function(t){if(!t||!t.state)return U;var e=t.state;return e.window&&(e.window=null),t.state=null,N},r.inflateGetHeader=function(t,e){var r;return t&&t.state?0==(2&(r=t.state).wrap)?U:((r.head=e).done=!1,N):U},r.inflateSetDictionary=function(t,e){var r,i=e.length;return t&&t.state?0!==(r=t.state).wrap&&11!==r.mode?U:11===r.mode&&O(1,e,i,0)!==r.check?-3:Z(t,e,i,i)?(r.mode=31,-4):(r.havedict=1,N):U},r.inflateInfo="pako inflate (from Nodeca project)";},{"../utils/common":41,"./adler32":43,"./crc32":45,"./inffast":48,"./inftrees":50}],50:[function(t,e,r){var D=t("../utils/common"),F=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],N=[16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78],U=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0],P=[16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64];e.exports=function(t,e,r,i,n,s,a,o){var h,u,l,f,d,c,p,m,_,g=o.bits,b=0,v=0,y=0,w=0,k=0,x=0,S=0,z=0,C=0,E=0,A=null,I=0,O=new D.Buf16(16),B=new D.Buf16(16),R=null,T=0;for(b=0;b<=15;b++)O[b]=0;for(v=0;v<i;v++)O[e[r+v]]++;for(k=g,w=15;1<=w&&0===O[w];w--);if(w<k&&(k=w),0===w)return n[s++]=20971520,n[s++]=20971520,o.bits=1,0;for(y=1;y<w&&0===O[y];y++);for(k<y&&(k=y),b=z=1;b<=15;b++)if(z<<=1,(z-=O[b])<0)return -1;if(0<z&&(0===t||1!==w))return -1;for(B[1]=0,b=1;b<15;b++)B[b+1]=B[b]+O[b];for(v=0;v<i;v++)0!==e[r+v]&&(a[B[e[r+v]]++]=v);if(c=0===t?(A=R=a,19):1===t?(A=F,I-=257,R=N,T-=257,256):(A=U,R=P,-1),b=y,d=s,S=v=E=0,l=-1,f=(C=1<<(x=k))-1,1===t&&852<C||2===t&&592<C)return 1;for(;;){for(p=b-S,_=a[v]<c?(m=0,a[v]):a[v]>c?(m=R[T+a[v]],A[I+a[v]]):(m=96,0),h=1<<b-S,y=u=1<<x;n[d+(E>>S)+(u-=h)]=p<<24|m<<16|_|0,0!==u;);for(h=1<<b-1;E&h;)h>>=1;if(0!==h?(E&=h-1,E+=h):E=0,v++,0==--O[b]){if(b===w)break;b=e[r+a[v]];}if(k<b&&(E&f)!==l){for(0===S&&(S=k),d+=y,z=1<<(x=b-S);x+S<w&&!((z-=O[x+S])<=0);)x++,z<<=1;if(C+=1<<x,1===t&&852<C||2===t&&592<C)return 1;n[l=E&f]=k<<24|x<<16|d-s|0;}}return 0!==E&&(n[d+E]=b-S<<24|64<<16|0),o.bits=k,0};},{"../utils/common":41}],51:[function(t,e,r){e.exports={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"};},{}],52:[function(t,e,r){var n=t("../utils/common"),o=0,h=1;function i(t){for(var e=t.length;0<=--e;)t[e]=0;}var s=0,a=29,u=256,l=u+1+a,f=30,d=19,_=2*l+1,g=15,c=16,p=7,m=256,b=16,v=17,y=18,w=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],k=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],x=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7],S=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],z=new Array(2*(l+2));i(z);var C=new Array(2*f);i(C);var E=new Array(512);i(E);var A=new Array(256);i(A);var I=new Array(a);i(I);var O,B,R,T=new Array(f);function D(t,e,r,i,n){this.static_tree=t,this.extra_bits=e,this.extra_base=r,this.elems=i,this.max_length=n,this.has_stree=t&&t.length;}function F(t,e){this.dyn_tree=t,this.max_code=0,this.stat_desc=e;}function N(t){return t<256?E[t]:E[256+(t>>>7)]}function U(t,e){t.pending_buf[t.pending++]=255&e,t.pending_buf[t.pending++]=e>>>8&255;}function P(t,e,r){t.bi_valid>c-r?(t.bi_buf|=e<<t.bi_valid&65535,U(t,t.bi_buf),t.bi_buf=e>>c-t.bi_valid,t.bi_valid+=r-c):(t.bi_buf|=e<<t.bi_valid&65535,t.bi_valid+=r);}function L(t,e,r){P(t,r[2*e],r[2*e+1]);}function j(t,e){for(var r=0;r|=1&t,t>>>=1,r<<=1,0<--e;);return r>>>1}function Z(t,e,r){var i,n,s=new Array(g+1),a=0;for(i=1;i<=g;i++)s[i]=a=a+r[i-1]<<1;for(n=0;n<=e;n++){var o=t[2*n+1];0!==o&&(t[2*n]=j(s[o]++,o));}}function W(t){var e;for(e=0;e<l;e++)t.dyn_ltree[2*e]=0;for(e=0;e<f;e++)t.dyn_dtree[2*e]=0;for(e=0;e<d;e++)t.bl_tree[2*e]=0;t.dyn_ltree[2*m]=1,t.opt_len=t.static_len=0,t.last_lit=t.matches=0;}function M(t){8<t.bi_valid?U(t,t.bi_buf):0<t.bi_valid&&(t.pending_buf[t.pending++]=t.bi_buf),t.bi_buf=0,t.bi_valid=0;}function H(t,e,r,i){var n=2*e,s=2*r;return t[n]<t[s]||t[n]===t[s]&&i[e]<=i[r]}function G(t,e,r){for(var i=t.heap[r],n=r<<1;n<=t.heap_len&&(n<t.heap_len&&H(e,t.heap[n+1],t.heap[n],t.depth)&&n++,!H(e,i,t.heap[n],t.depth));)t.heap[r]=t.heap[n],r=n,n<<=1;t.heap[r]=i;}function K(t,e,r){var i,n,s,a,o=0;if(0!==t.last_lit)for(;i=t.pending_buf[t.d_buf+2*o]<<8|t.pending_buf[t.d_buf+2*o+1],n=t.pending_buf[t.l_buf+o],o++,0===i?L(t,n,e):(L(t,(s=A[n])+u+1,e),0!==(a=w[s])&&P(t,n-=I[s],a),L(t,s=N(--i),r),0!==(a=k[s])&&P(t,i-=T[s],a)),o<t.last_lit;);L(t,m,e);}function Y(t,e){var r,i,n,s=e.dyn_tree,a=e.stat_desc.static_tree,o=e.stat_desc.has_stree,h=e.stat_desc.elems,u=-1;for(t.heap_len=0,t.heap_max=_,r=0;r<h;r++)0!==s[2*r]?(t.heap[++t.heap_len]=u=r,t.depth[r]=0):s[2*r+1]=0;for(;t.heap_len<2;)s[2*(n=t.heap[++t.heap_len]=u<2?++u:0)]=1,t.depth[n]=0,t.opt_len--,o&&(t.static_len-=a[2*n+1]);for(e.max_code=u,r=t.heap_len>>1;1<=r;r--)G(t,s,r);for(n=h;r=t.heap[1],t.heap[1]=t.heap[t.heap_len--],G(t,s,1),i=t.heap[1],t.heap[--t.heap_max]=r,t.heap[--t.heap_max]=i,s[2*n]=s[2*r]+s[2*i],t.depth[n]=(t.depth[r]>=t.depth[i]?t.depth[r]:t.depth[i])+1,s[2*r+1]=s[2*i+1]=n,t.heap[1]=n++,G(t,s,1),2<=t.heap_len;);t.heap[--t.heap_max]=t.heap[1],function(t,e){var r,i,n,s,a,o,h=e.dyn_tree,u=e.max_code,l=e.stat_desc.static_tree,f=e.stat_desc.has_stree,d=e.stat_desc.extra_bits,c=e.stat_desc.extra_base,p=e.stat_desc.max_length,m=0;for(s=0;s<=g;s++)t.bl_count[s]=0;for(h[2*t.heap[t.heap_max]+1]=0,r=t.heap_max+1;r<_;r++)p<(s=h[2*h[2*(i=t.heap[r])+1]+1]+1)&&(s=p,m++),h[2*i+1]=s,u<i||(t.bl_count[s]++,a=0,c<=i&&(a=d[i-c]),o=h[2*i],t.opt_len+=o*(s+a),f&&(t.static_len+=o*(l[2*i+1]+a)));if(0!==m){do{for(s=p-1;0===t.bl_count[s];)s--;t.bl_count[s]--,t.bl_count[s+1]+=2,t.bl_count[p]--,m-=2;}while(0<m);for(s=p;0!==s;s--)for(i=t.bl_count[s];0!==i;)u<(n=t.heap[--r])||(h[2*n+1]!==s&&(t.opt_len+=(s-h[2*n+1])*h[2*n],h[2*n+1]=s),i--);}}(t,e),Z(s,u,t.bl_count);}function X(t,e,r){var i,n,s=-1,a=e[1],o=0,h=7,u=4;for(0===a&&(h=138,u=3),e[2*(r+1)+1]=65535,i=0;i<=r;i++)n=a,a=e[2*(i+1)+1],++o<h&&n===a||(o<u?t.bl_tree[2*n]+=o:0!==n?(n!==s&&t.bl_tree[2*n]++,t.bl_tree[2*b]++):o<=10?t.bl_tree[2*v]++:t.bl_tree[2*y]++,s=n,u=(o=0)===a?(h=138,3):n===a?(h=6,3):(h=7,4));}function V(t,e,r){var i,n,s=-1,a=e[1],o=0,h=7,u=4;for(0===a&&(h=138,u=3),i=0;i<=r;i++)if(n=a,a=e[2*(i+1)+1],!(++o<h&&n===a)){if(o<u)for(;L(t,n,t.bl_tree),0!=--o;);else 0!==n?(n!==s&&(L(t,n,t.bl_tree),o--),L(t,b,t.bl_tree),P(t,o-3,2)):o<=10?(L(t,v,t.bl_tree),P(t,o-3,3)):(L(t,y,t.bl_tree),P(t,o-11,7));s=n,u=(o=0)===a?(h=138,3):n===a?(h=6,3):(h=7,4);}}i(T);var q=!1;function J(t,e,r,i){P(t,(s<<1)+(i?1:0),3),function(t,e,r,i){M(t),i&&(U(t,r),U(t,~r)),n.arraySet(t.pending_buf,t.window,e,r,t.pending),t.pending+=r;}(t,e,r,!0);}r._tr_init=function(t){q||(function(){var t,e,r,i,n,s=new Array(g+1);for(i=r=0;i<a-1;i++)for(I[i]=r,t=0;t<1<<w[i];t++)A[r++]=i;for(A[r-1]=i,i=n=0;i<16;i++)for(T[i]=n,t=0;t<1<<k[i];t++)E[n++]=i;for(n>>=7;i<f;i++)for(T[i]=n<<7,t=0;t<1<<k[i]-7;t++)E[256+n++]=i;for(e=0;e<=g;e++)s[e]=0;for(t=0;t<=143;)z[2*t+1]=8,t++,s[8]++;for(;t<=255;)z[2*t+1]=9,t++,s[9]++;for(;t<=279;)z[2*t+1]=7,t++,s[7]++;for(;t<=287;)z[2*t+1]=8,t++,s[8]++;for(Z(z,l+1,s),t=0;t<f;t++)C[2*t+1]=5,C[2*t]=j(t,5);O=new D(z,w,u+1,l,g),B=new D(C,k,0,f,g),R=new D(new Array(0),x,0,d,p);}(),q=!0),t.l_desc=new F(t.dyn_ltree,O),t.d_desc=new F(t.dyn_dtree,B),t.bl_desc=new F(t.bl_tree,R),t.bi_buf=0,t.bi_valid=0,W(t);},r._tr_stored_block=J,r._tr_flush_block=function(t,e,r,i){var n,s,a=0;0<t.level?(2===t.strm.data_type&&(t.strm.data_type=function(t){var e,r=4093624447;for(e=0;e<=31;e++,r>>>=1)if(1&r&&0!==t.dyn_ltree[2*e])return o;if(0!==t.dyn_ltree[18]||0!==t.dyn_ltree[20]||0!==t.dyn_ltree[26])return h;for(e=32;e<u;e++)if(0!==t.dyn_ltree[2*e])return h;return o}(t)),Y(t,t.l_desc),Y(t,t.d_desc),a=function(t){var e;for(X(t,t.dyn_ltree,t.l_desc.max_code),X(t,t.dyn_dtree,t.d_desc.max_code),Y(t,t.bl_desc),e=d-1;3<=e&&0===t.bl_tree[2*S[e]+1];e--);return t.opt_len+=3*(e+1)+5+5+4,e}(t),n=t.opt_len+3+7>>>3,(s=t.static_len+3+7>>>3)<=n&&(n=s)):n=s=r+5,r+4<=n&&-1!==e?J(t,e,r,i):4===t.strategy||s===n?(P(t,2+(i?1:0),3),K(t,z,C)):(P(t,4+(i?1:0),3),function(t,e,r,i){var n;for(P(t,e-257,5),P(t,r-1,5),P(t,i-4,4),n=0;n<i;n++)P(t,t.bl_tree[2*S[n]+1],3);V(t,t.dyn_ltree,e-1),V(t,t.dyn_dtree,r-1);}(t,t.l_desc.max_code+1,t.d_desc.max_code+1,a+1),K(t,t.dyn_ltree,t.dyn_dtree)),W(t),i&&M(t);},r._tr_tally=function(t,e,r){return t.pending_buf[t.d_buf+2*t.last_lit]=e>>>8&255,t.pending_buf[t.d_buf+2*t.last_lit+1]=255&e,t.pending_buf[t.l_buf+t.last_lit]=255&r,t.last_lit++,0===e?t.dyn_ltree[2*r]++:(t.matches++,e--,t.dyn_ltree[2*(A[r]+u+1)]++,t.dyn_dtree[2*N(e)]++),t.last_lit===t.lit_bufsize-1},r._tr_align=function(t){P(t,2,3),L(t,m,z),function(t){16===t.bi_valid?(U(t,t.bi_buf),t.bi_buf=0,t.bi_valid=0):8<=t.bi_valid&&(t.pending_buf[t.pending++]=255&t.bi_buf,t.bi_buf>>=8,t.bi_valid-=8);}(t);};},{"../utils/common":41}],53:[function(t,e,r){e.exports=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0;};},{}],54:[function(t,e,r){e.exports="function"==typeof setImmediate?setImmediate:function(){var t=[].slice.apply(arguments);t.splice(1,0,0),setTimeout.apply(null,t);};},{}]},{},[10])(10)});
    }(jszip_min));

    var JsZip = jszip_min.exports;

    var FileSaver_min = {exports: {}};

    (function (module, exports) {
    (function(a,b){b();})(commonjsGlobal,function(){function b(a,b){return "undefined"==typeof b?b={autoBom:!1}:"object"!=typeof b&&(console.warn("Deprecated: Expected third argument to be a object"),b={autoBom:!b}),b.autoBom&&/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(a.type)?new Blob(["\uFEFF",a],{type:a.type}):a}function c(a,b,c){var d=new XMLHttpRequest;d.open("GET",a),d.responseType="blob",d.onload=function(){g(d.response,b,c);},d.onerror=function(){console.error("could not download file");},d.send();}function d(a){var b=new XMLHttpRequest;b.open("HEAD",a,!1);try{b.send();}catch(a){}return 200<=b.status&&299>=b.status}function e(a){try{a.dispatchEvent(new MouseEvent("click"));}catch(c){var b=document.createEvent("MouseEvents");b.initMouseEvent("click",!0,!0,window,0,0,0,80,20,!1,!1,!1,!1,0,null),a.dispatchEvent(b);}}var f="object"==typeof window&&window.window===window?window:"object"==typeof self&&self.self===self?self:"object"==typeof commonjsGlobal&&commonjsGlobal.global===commonjsGlobal?commonjsGlobal:void 0,a=f.navigator&&/Macintosh/.test(navigator.userAgent)&&/AppleWebKit/.test(navigator.userAgent)&&!/Safari/.test(navigator.userAgent),g=f.saveAs||("object"!=typeof window||window!==f?function(){}:"download"in HTMLAnchorElement.prototype&&!a?function(b,g,h){var i=f.URL||f.webkitURL,j=document.createElement("a");g=g||b.name||"download",j.download=g,j.rel="noopener","string"==typeof b?(j.href=b,j.origin===location.origin?e(j):d(j.href)?c(b,g,h):e(j,j.target="_blank")):(j.href=i.createObjectURL(b),setTimeout(function(){i.revokeObjectURL(j.href);},4E4),setTimeout(function(){e(j);},0));}:"msSaveOrOpenBlob"in navigator?function(f,g,h){if(g=g||f.name||"download","string"!=typeof f)navigator.msSaveOrOpenBlob(b(f,h),g);else if(d(f))c(f,g,h);else {var i=document.createElement("a");i.href=f,i.target="_blank",setTimeout(function(){e(i);});}}:function(b,d,e,g){if(g=g||open("","_blank"),g&&(g.document.title=g.document.body.innerText="downloading..."),"string"==typeof b)return c(b,d,e);var h="application/octet-stream"===b.type,i=/constructor/i.test(f.HTMLElement)||f.safari,j=/CriOS\/[\d]+/.test(navigator.userAgent);if((j||h&&i||a)&&"undefined"!=typeof FileReader){var k=new FileReader;k.onloadend=function(){var a=k.result;a=j?a:a.replace(/^data:[^;]*;/,"data:attachment/file;"),g?g.location.href=a:location=a,g=null;},k.readAsDataURL(b);}else {var l=f.URL||f.webkitURL,m=l.createObjectURL(b);g?g.location=m:location.href=m,g=null,setTimeout(function(){l.revokeObjectURL(m);},4E4);}});f.saveAs=g.saveAs=g,(module.exports=g);});


    }(FileSaver_min));

    function typedArrayToBuffer(array) {
        return array.buffer.slice(array.byteOffset, array.byteLength + array.byteOffset);
    }
    const createDownloadZip = async (data) => {
        console.log('Start generating images');
        downloadStatus.setMessage('Start generating images');
        const zip = new JsZip();
        // Replace with a proper readme
        zip.file('Hello.txt', 'Hello World\n');
        for (const folderName in data) {
            let folder;
            if (folderName === 'root') {
                folder = zip;
            }
            else {
                folder = zip.folder(folderName);
            }
            for (const nodeId in data[folderName]) {
                const { imageData, name } = data[folderName][nodeId];
                const cleanBytes = typedArrayToBuffer(imageData);
                const type = 'image/png';
                const extension = '.png';
                const blob = new Blob([cleanBytes], { type });
                folder.file(`${name}${extension}`, blob);
            }
        }
        const zipFile = await zip.generateAsync({ type: 'blob' });
        downloadStatus.setMessage('');
        FileSaver_min.exports.saveAs(zipFile, 'example.zip');
    };

    window.onmessage = async ({ data }) => {
        switch (data.pluginMessage.type) {
            case MessageTypes.Pages:
                pages.setPages(data.pluginMessage.data);
                break;
            case MessageTypes.DownloadList:
                downloadList.setList(data.pluginMessage.data);
                break;
            case MessageTypes.DownloadData:
                // And now do this magic: https://github.com/brianlovin/figma-export-zip/blob/main/src/ui.ts
                console.log('Data', data.pluginMessage.data);
                await createDownloadZip(data.pluginMessage.data);
                break;
            case MessageTypes.DownloadMessage:
                console.log(data.pluginMessage.data);
                downloadStatus.setMessage(data.pluginMessage.data);
                break;
        }
    };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const app = new App({
        target: document.body,
    });

    return app;

}));
