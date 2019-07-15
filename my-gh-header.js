/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const directives = new WeakMap();
/**
 * Brands a function as a directive factory function so that lit-html will call
 * the function during template rendering, rather than passing as a value.
 *
 * A _directive_ is a function that takes a Part as an argument. It has the
 * signature: `(part: Part) => void`.
 *
 * A directive _factory_ is a function that takes arguments for data and
 * configuration and returns a directive. Users of directive usually refer to
 * the directive factory as the directive. For example, "The repeat directive".
 *
 * Usually a template author will invoke a directive factory in their template
 * with relevant arguments, which will then return a directive function.
 *
 * Here's an example of using the `repeat()` directive factory that takes an
 * array and a function to render an item:
 *
 * ```js
 * html`<ul><${repeat(items, (item) => html`<li>${item}</li>`)}</ul>`
 * ```
 *
 * When `repeat` is invoked, it returns a directive function that closes over
 * `items` and the template function. When the outer template is rendered, the
 * return directive function is called with the Part for the expression.
 * `repeat` then performs it's custom logic to render multiple items.
 *
 * @param f The directive factory function. Must be a function that returns a
 * function of the signature `(part: Part) => void`. The returned function will
 * be called with the part object.
 *
 * @example
 *
 * import {directive, html} from 'lit-html';
 *
 * const immutable = directive((v) => (part) => {
 *   if (part.value !== v) {
 *     part.setValue(v)
 *   }
 * });
 */
const directive = (f) => ((...args) => {
    const d = f(...args);
    directives.set(d, true);
    return d;
});
const isDirective = (o) => {
    return typeof o === 'function' && directives.has(o);
};

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * True if the custom elements polyfill is in use.
 */
const isCEPolyfill = window.customElements !== undefined &&
    window.customElements.polyfillWrapFlushCallback !==
        undefined;
/**
 * Reparents nodes, starting from `start` (inclusive) to `end` (exclusive),
 * into another container (could be the same container), before `before`. If
 * `before` is null, it appends the nodes to the container.
 */
const reparentNodes = (container, start, end = null, before = null) => {
    while (start !== end) {
        const n = start.nextSibling;
        container.insertBefore(start, before);
        start = n;
    }
};
/**
 * Removes nodes, starting from `start` (inclusive) to `end` (exclusive), from
 * `container`.
 */
const removeNodes = (container, start, end = null) => {
    while (start !== end) {
        const n = start.nextSibling;
        container.removeChild(start);
        start = n;
    }
};

/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * A sentinel value that signals that a value was handled by a directive and
 * should not be written to the DOM.
 */
const noChange = {};
/**
 * A sentinel value that signals a NodePart to fully clear its content.
 */
const nothing = {};

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * An expression marker with embedded unique key to avoid collision with
 * possible text in templates.
 */
const marker = `{{lit-${String(Math.random()).slice(2)}}}`;
/**
 * An expression marker used text-positions, multi-binding attributes, and
 * attributes with markup-like text values.
 */
const nodeMarker = `<!--${marker}-->`;
const markerRegex = new RegExp(`${marker}|${nodeMarker}`);
/**
 * Suffix appended to all bound attribute names.
 */
const boundAttributeSuffix = '$lit$';
/**
 * An updateable Template that tracks the location of dynamic parts.
 */
class Template {
    constructor(result, element) {
        this.parts = [];
        this.element = element;
        const nodesToRemove = [];
        const stack = [];
        // Edge needs all 4 parameters present; IE11 needs 3rd parameter to be null
        const walker = document.createTreeWalker(element.content, 133 /* NodeFilter.SHOW_{ELEMENT|COMMENT|TEXT} */, null, false);
        // Keeps track of the last index associated with a part. We try to delete
        // unnecessary nodes, but we never want to associate two different parts
        // to the same index. They must have a constant node between.
        let lastPartIndex = 0;
        let index = -1;
        let partIndex = 0;
        const { strings, values: { length } } = result;
        while (partIndex < length) {
            const node = walker.nextNode();
            if (node === null) {
                // We've exhausted the content inside a nested template element.
                // Because we still have parts (the outer for-loop), we know:
                // - There is a template in the stack
                // - The walker will find a nextNode outside the template
                walker.currentNode = stack.pop();
                continue;
            }
            index++;
            if (node.nodeType === 1 /* Node.ELEMENT_NODE */) {
                if (node.hasAttributes()) {
                    const attributes = node.attributes;
                    const { length } = attributes;
                    // Per
                    // https://developer.mozilla.org/en-US/docs/Web/API/NamedNodeMap,
                    // attributes are not guaranteed to be returned in document order.
                    // In particular, Edge/IE can return them out of order, so we cannot
                    // assume a correspondence between part index and attribute index.
                    let count = 0;
                    for (let i = 0; i < length; i++) {
                        if (endsWith(attributes[i].name, boundAttributeSuffix)) {
                            count++;
                        }
                    }
                    while (count-- > 0) {
                        // Get the template literal section leading up to the first
                        // expression in this attribute
                        const stringForPart = strings[partIndex];
                        // Find the attribute name
                        const name = lastAttributeNameRegex.exec(stringForPart)[2];
                        // Find the corresponding attribute
                        // All bound attributes have had a suffix added in
                        // TemplateResult#getHTML to opt out of special attribute
                        // handling. To look up the attribute value we also need to add
                        // the suffix.
                        const attributeLookupName = name.toLowerCase() + boundAttributeSuffix;
                        const attributeValue = node.getAttribute(attributeLookupName);
                        node.removeAttribute(attributeLookupName);
                        const statics = attributeValue.split(markerRegex);
                        this.parts.push({ type: 'attribute', index, name, strings: statics });
                        partIndex += statics.length - 1;
                    }
                }
                if (node.tagName === 'TEMPLATE') {
                    stack.push(node);
                    walker.currentNode = node.content;
                }
            }
            else if (node.nodeType === 3 /* Node.TEXT_NODE */) {
                const data = node.data;
                if (data.indexOf(marker) >= 0) {
                    const parent = node.parentNode;
                    const strings = data.split(markerRegex);
                    const lastIndex = strings.length - 1;
                    // Generate a new text node for each literal section
                    // These nodes are also used as the markers for node parts
                    for (let i = 0; i < lastIndex; i++) {
                        let insert;
                        let s = strings[i];
                        if (s === '') {
                            insert = createMarker();
                        }
                        else {
                            const match = lastAttributeNameRegex.exec(s);
                            if (match !== null && endsWith(match[2], boundAttributeSuffix)) {
                                s = s.slice(0, match.index) + match[1] +
                                    match[2].slice(0, -boundAttributeSuffix.length) + match[3];
                            }
                            insert = document.createTextNode(s);
                        }
                        parent.insertBefore(insert, node);
                        this.parts.push({ type: 'node', index: ++index });
                    }
                    // If there's no text, we must insert a comment to mark our place.
                    // Else, we can trust it will stick around after cloning.
                    if (strings[lastIndex] === '') {
                        parent.insertBefore(createMarker(), node);
                        nodesToRemove.push(node);
                    }
                    else {
                        node.data = strings[lastIndex];
                    }
                    // We have a part for each match found
                    partIndex += lastIndex;
                }
            }
            else if (node.nodeType === 8 /* Node.COMMENT_NODE */) {
                if (node.data === marker) {
                    const parent = node.parentNode;
                    // Add a new marker node to be the startNode of the Part if any of
                    // the following are true:
                    //  * We don't have a previousSibling
                    //  * The previousSibling is already the start of a previous part
                    if (node.previousSibling === null || index === lastPartIndex) {
                        index++;
                        parent.insertBefore(createMarker(), node);
                    }
                    lastPartIndex = index;
                    this.parts.push({ type: 'node', index });
                    // If we don't have a nextSibling, keep this node so we have an end.
                    // Else, we can remove it to save future costs.
                    if (node.nextSibling === null) {
                        node.data = '';
                    }
                    else {
                        nodesToRemove.push(node);
                        index--;
                    }
                    partIndex++;
                }
                else {
                    let i = -1;
                    while ((i = node.data.indexOf(marker, i + 1)) !== -1) {
                        // Comment node has a binding marker inside, make an inactive part
                        // The binding won't work, but subsequent bindings will
                        // TODO (justinfagnani): consider whether it's even worth it to
                        // make bindings in comments work
                        this.parts.push({ type: 'node', index: -1 });
                        partIndex++;
                    }
                }
            }
        }
        // Remove text binding nodes after the walk to not disturb the TreeWalker
        for (const n of nodesToRemove) {
            n.parentNode.removeChild(n);
        }
    }
}
const endsWith = (str, suffix) => {
    const index = str.length - suffix.length;
    return index >= 0 && str.slice(index) === suffix;
};
const isTemplatePartActive = (part) => part.index !== -1;
// Allows `document.createComment('')` to be renamed for a
// small manual size-savings.
const createMarker = () => document.createComment('');
/**
 * This regex extracts the attribute name preceding an attribute-position
 * expression. It does this by matching the syntax allowed for attributes
 * against the string literal directly preceding the expression, assuming that
 * the expression is in an attribute-value position.
 *
 * See attributes in the HTML spec:
 * https://www.w3.org/TR/html5/syntax.html#elements-attributes
 *
 * " \x09\x0a\x0c\x0d" are HTML space characters:
 * https://www.w3.org/TR/html5/infrastructure.html#space-characters
 *
 * "\0-\x1F\x7F-\x9F" are Unicode control characters, which includes every
 * space character except " ".
 *
 * So an attribute is:
 *  * The name: any character except a control character, space character, ('),
 *    ("), ">", "=", or "/"
 *  * Followed by zero or more space characters
 *  * Followed by "="
 *  * Followed by zero or more space characters
 *  * Followed by:
 *    * Any character except space, ('), ("), "<", ">", "=", (`), or
 *    * (") then any non-("), or
 *    * (') then any non-(')
 */
const lastAttributeNameRegex = /([ \x09\x0a\x0c\x0d])([^\0-\x1F\x7F-\x9F "'>=/]+)([ \x09\x0a\x0c\x0d]*=[ \x09\x0a\x0c\x0d]*(?:[^ \x09\x0a\x0c\x0d"'`<>=]*|"[^"]*|'[^']*))$/;

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * An instance of a `Template` that can be attached to the DOM and updated
 * with new values.
 */
class TemplateInstance {
    constructor(template, processor, options) {
        this.__parts = [];
        this.template = template;
        this.processor = processor;
        this.options = options;
    }
    update(values) {
        let i = 0;
        for (const part of this.__parts) {
            if (part !== undefined) {
                part.setValue(values[i]);
            }
            i++;
        }
        for (const part of this.__parts) {
            if (part !== undefined) {
                part.commit();
            }
        }
    }
    _clone() {
        // There are a number of steps in the lifecycle of a template instance's
        // DOM fragment:
        //  1. Clone - create the instance fragment
        //  2. Adopt - adopt into the main document
        //  3. Process - find part markers and create parts
        //  4. Upgrade - upgrade custom elements
        //  5. Update - set node, attribute, property, etc., values
        //  6. Connect - connect to the document. Optional and outside of this
        //     method.
        //
        // We have a few constraints on the ordering of these steps:
        //  * We need to upgrade before updating, so that property values will pass
        //    through any property setters.
        //  * We would like to process before upgrading so that we're sure that the
        //    cloned fragment is inert and not disturbed by self-modifying DOM.
        //  * We want custom elements to upgrade even in disconnected fragments.
        //
        // Given these constraints, with full custom elements support we would
        // prefer the order: Clone, Process, Adopt, Upgrade, Update, Connect
        //
        // But Safari dooes not implement CustomElementRegistry#upgrade, so we
        // can not implement that order and still have upgrade-before-update and
        // upgrade disconnected fragments. So we instead sacrifice the
        // process-before-upgrade constraint, since in Custom Elements v1 elements
        // must not modify their light DOM in the constructor. We still have issues
        // when co-existing with CEv0 elements like Polymer 1, and with polyfills
        // that don't strictly adhere to the no-modification rule because shadow
        // DOM, which may be created in the constructor, is emulated by being placed
        // in the light DOM.
        //
        // The resulting order is on native is: Clone, Adopt, Upgrade, Process,
        // Update, Connect. document.importNode() performs Clone, Adopt, and Upgrade
        // in one step.
        //
        // The Custom Elements v1 polyfill supports upgrade(), so the order when
        // polyfilled is the more ideal: Clone, Process, Adopt, Upgrade, Update,
        // Connect.
        const fragment = isCEPolyfill ?
            this.template.element.content.cloneNode(true) :
            document.importNode(this.template.element.content, true);
        const stack = [];
        const parts = this.template.parts;
        // Edge needs all 4 parameters present; IE11 needs 3rd parameter to be null
        const walker = document.createTreeWalker(fragment, 133 /* NodeFilter.SHOW_{ELEMENT|COMMENT|TEXT} */, null, false);
        let partIndex = 0;
        let nodeIndex = 0;
        let part;
        let node = walker.nextNode();
        // Loop through all the nodes and parts of a template
        while (partIndex < parts.length) {
            part = parts[partIndex];
            if (!isTemplatePartActive(part)) {
                this.__parts.push(undefined);
                partIndex++;
                continue;
            }
            // Progress the tree walker until we find our next part's node.
            // Note that multiple parts may share the same node (attribute parts
            // on a single element), so this loop may not run at all.
            while (nodeIndex < part.index) {
                nodeIndex++;
                if (node.nodeName === 'TEMPLATE') {
                    stack.push(node);
                    walker.currentNode = node.content;
                }
                if ((node = walker.nextNode()) === null) {
                    // We've exhausted the content inside a nested template element.
                    // Because we still have parts (the outer for-loop), we know:
                    // - There is a template in the stack
                    // - The walker will find a nextNode outside the template
                    walker.currentNode = stack.pop();
                    node = walker.nextNode();
                }
            }
            // We've arrived at our part's node.
            if (part.type === 'node') {
                const part = this.processor.handleTextExpression(this.options);
                part.insertAfterNode(node.previousSibling);
                this.__parts.push(part);
            }
            else {
                this.__parts.push(...this.processor.handleAttributeExpressions(node, part.name, part.strings, this.options));
            }
            partIndex++;
        }
        if (isCEPolyfill) {
            document.adoptNode(fragment);
            customElements.upgrade(fragment);
        }
        return fragment;
    }
}

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * The return type of `html`, which holds a Template and the values from
 * interpolated expressions.
 */
class TemplateResult {
    constructor(strings, values, type, processor) {
        this.strings = strings;
        this.values = values;
        this.type = type;
        this.processor = processor;
    }
    /**
     * Returns a string of HTML used to create a `<template>` element.
     */
    getHTML() {
        const l = this.strings.length - 1;
        let html = '';
        let isCommentBinding = false;
        for (let i = 0; i < l; i++) {
            const s = this.strings[i];
            // For each binding we want to determine the kind of marker to insert
            // into the template source before it's parsed by the browser's HTML
            // parser. The marker type is based on whether the expression is in an
            // attribute, text, or comment poisition.
            //   * For node-position bindings we insert a comment with the marker
            //     sentinel as its text content, like <!--{{lit-guid}}-->.
            //   * For attribute bindings we insert just the marker sentinel for the
            //     first binding, so that we support unquoted attribute bindings.
            //     Subsequent bindings can use a comment marker because multi-binding
            //     attributes must be quoted.
            //   * For comment bindings we insert just the marker sentinel so we don't
            //     close the comment.
            //
            // The following code scans the template source, but is *not* an HTML
            // parser. We don't need to track the tree structure of the HTML, only
            // whether a binding is inside a comment, and if not, if it appears to be
            // the first binding in an attribute.
            const commentOpen = s.lastIndexOf('<!--');
            // We're in comment position if we have a comment open with no following
            // comment close. Because <-- can appear in an attribute value there can
            // be false positives.
            isCommentBinding = (commentOpen > -1 || isCommentBinding) &&
                s.indexOf('-->', commentOpen + 1) === -1;
            // Check to see if we have an attribute-like sequence preceeding the
            // expression. This can match "name=value" like structures in text,
            // comments, and attribute values, so there can be false-positives.
            const attributeMatch = lastAttributeNameRegex.exec(s);
            if (attributeMatch === null) {
                // We're only in this branch if we don't have a attribute-like
                // preceeding sequence. For comments, this guards against unusual
                // attribute values like <div foo="<!--${'bar'}">. Cases like
                // <!-- foo=${'bar'}--> are handled correctly in the attribute branch
                // below.
                html += s + (isCommentBinding ? marker : nodeMarker);
            }
            else {
                // For attributes we use just a marker sentinel, and also append a
                // $lit$ suffix to the name to opt-out of attribute-specific parsing
                // that IE and Edge do for style and certain SVG attributes.
                html += s.substr(0, attributeMatch.index) + attributeMatch[1] +
                    attributeMatch[2] + boundAttributeSuffix + attributeMatch[3] +
                    marker;
            }
        }
        html += this.strings[l];
        return html;
    }
    getTemplateElement() {
        const template = document.createElement('template');
        template.innerHTML = this.getHTML();
        return template;
    }
}

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const isPrimitive = (value) => {
    return (value === null ||
        !(typeof value === 'object' || typeof value === 'function'));
};
const isIterable = (value) => {
    return Array.isArray(value) ||
        // tslint:disable-next-line:no-any
        !!(value && value[Symbol.iterator]);
};
/**
 * Writes attribute values to the DOM for a group of AttributeParts bound to a
 * single attibute. The value is only set once even if there are multiple parts
 * for an attribute.
 */
class AttributeCommitter {
    constructor(element, name, strings) {
        this.dirty = true;
        this.element = element;
        this.name = name;
        this.strings = strings;
        this.parts = [];
        for (let i = 0; i < strings.length - 1; i++) {
            this.parts[i] = this._createPart();
        }
    }
    /**
     * Creates a single part. Override this to create a differnt type of part.
     */
    _createPart() {
        return new AttributePart(this);
    }
    _getValue() {
        const strings = this.strings;
        const l = strings.length - 1;
        let text = '';
        for (let i = 0; i < l; i++) {
            text += strings[i];
            const part = this.parts[i];
            if (part !== undefined) {
                const v = part.value;
                if (isPrimitive(v) || !isIterable(v)) {
                    text += typeof v === 'string' ? v : String(v);
                }
                else {
                    for (const t of v) {
                        text += typeof t === 'string' ? t : String(t);
                    }
                }
            }
        }
        text += strings[l];
        return text;
    }
    commit() {
        if (this.dirty) {
            this.dirty = false;
            this.element.setAttribute(this.name, this._getValue());
        }
    }
}
/**
 * A Part that controls all or part of an attribute value.
 */
class AttributePart {
    constructor(committer) {
        this.value = undefined;
        this.committer = committer;
    }
    setValue(value) {
        if (value !== noChange && (!isPrimitive(value) || value !== this.value)) {
            this.value = value;
            // If the value is a not a directive, dirty the committer so that it'll
            // call setAttribute. If the value is a directive, it'll dirty the
            // committer if it calls setValue().
            if (!isDirective(value)) {
                this.committer.dirty = true;
            }
        }
    }
    commit() {
        while (isDirective(this.value)) {
            const directive = this.value;
            this.value = noChange;
            directive(this);
        }
        if (this.value === noChange) {
            return;
        }
        this.committer.commit();
    }
}
/**
 * A Part that controls a location within a Node tree. Like a Range, NodePart
 * has start and end locations and can set and update the Nodes between those
 * locations.
 *
 * NodeParts support several value types: primitives, Nodes, TemplateResults,
 * as well as arrays and iterables of those types.
 */
class NodePart {
    constructor(options) {
        this.value = undefined;
        this.__pendingValue = undefined;
        this.options = options;
    }
    /**
     * Appends this part into a container.
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    appendInto(container) {
        this.startNode = container.appendChild(createMarker());
        this.endNode = container.appendChild(createMarker());
    }
    /**
     * Inserts this part after the `ref` node (between `ref` and `ref`'s next
     * sibling). Both `ref` and its next sibling must be static, unchanging nodes
     * such as those that appear in a literal section of a template.
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    insertAfterNode(ref) {
        this.startNode = ref;
        this.endNode = ref.nextSibling;
    }
    /**
     * Appends this part into a parent part.
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    appendIntoPart(part) {
        part.__insert(this.startNode = createMarker());
        part.__insert(this.endNode = createMarker());
    }
    /**
     * Inserts this part after the `ref` part.
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    insertAfterPart(ref) {
        ref.__insert(this.startNode = createMarker());
        this.endNode = ref.endNode;
        ref.endNode = this.startNode;
    }
    setValue(value) {
        this.__pendingValue = value;
    }
    commit() {
        while (isDirective(this.__pendingValue)) {
            const directive = this.__pendingValue;
            this.__pendingValue = noChange;
            directive(this);
        }
        const value = this.__pendingValue;
        if (value === noChange) {
            return;
        }
        if (isPrimitive(value)) {
            if (value !== this.value) {
                this.__commitText(value);
            }
        }
        else if (value instanceof TemplateResult) {
            this.__commitTemplateResult(value);
        }
        else if (value instanceof Node) {
            this.__commitNode(value);
        }
        else if (isIterable(value)) {
            this.__commitIterable(value);
        }
        else if (value === nothing) {
            this.value = nothing;
            this.clear();
        }
        else {
            // Fallback, will render the string representation
            this.__commitText(value);
        }
    }
    __insert(node) {
        this.endNode.parentNode.insertBefore(node, this.endNode);
    }
    __commitNode(value) {
        if (this.value === value) {
            return;
        }
        this.clear();
        this.__insert(value);
        this.value = value;
    }
    __commitText(value) {
        const node = this.startNode.nextSibling;
        value = value == null ? '' : value;
        if (node === this.endNode.previousSibling &&
            node.nodeType === 3 /* Node.TEXT_NODE */) {
            // If we only have a single text node between the markers, we can just
            // set its value, rather than replacing it.
            // TODO(justinfagnani): Can we just check if this.value is primitive?
            node.data = value;
        }
        else {
            this.__commitNode(document.createTextNode(typeof value === 'string' ? value : String(value)));
        }
        this.value = value;
    }
    __commitTemplateResult(value) {
        const template = this.options.templateFactory(value);
        if (this.value instanceof TemplateInstance &&
            this.value.template === template) {
            this.value.update(value.values);
        }
        else {
            // Make sure we propagate the template processor from the TemplateResult
            // so that we use its syntax extension, etc. The template factory comes
            // from the render function options so that it can control template
            // caching and preprocessing.
            const instance = new TemplateInstance(template, value.processor, this.options);
            const fragment = instance._clone();
            instance.update(value.values);
            this.__commitNode(fragment);
            this.value = instance;
        }
    }
    __commitIterable(value) {
        // For an Iterable, we create a new InstancePart per item, then set its
        // value to the item. This is a little bit of overhead for every item in
        // an Iterable, but it lets us recurse easily and efficiently update Arrays
        // of TemplateResults that will be commonly returned from expressions like:
        // array.map((i) => html`${i}`), by reusing existing TemplateInstances.
        // If _value is an array, then the previous render was of an
        // iterable and _value will contain the NodeParts from the previous
        // render. If _value is not an array, clear this part and make a new
        // array for NodeParts.
        if (!Array.isArray(this.value)) {
            this.value = [];
            this.clear();
        }
        // Lets us keep track of how many items we stamped so we can clear leftover
        // items from a previous render
        const itemParts = this.value;
        let partIndex = 0;
        let itemPart;
        for (const item of value) {
            // Try to reuse an existing part
            itemPart = itemParts[partIndex];
            // If no existing part, create a new one
            if (itemPart === undefined) {
                itemPart = new NodePart(this.options);
                itemParts.push(itemPart);
                if (partIndex === 0) {
                    itemPart.appendIntoPart(this);
                }
                else {
                    itemPart.insertAfterPart(itemParts[partIndex - 1]);
                }
            }
            itemPart.setValue(item);
            itemPart.commit();
            partIndex++;
        }
        if (partIndex < itemParts.length) {
            // Truncate the parts array so _value reflects the current state
            itemParts.length = partIndex;
            this.clear(itemPart && itemPart.endNode);
        }
    }
    clear(startNode = this.startNode) {
        removeNodes(this.startNode.parentNode, startNode.nextSibling, this.endNode);
    }
}
/**
 * Implements a boolean attribute, roughly as defined in the HTML
 * specification.
 *
 * If the value is truthy, then the attribute is present with a value of
 * ''. If the value is falsey, the attribute is removed.
 */
class BooleanAttributePart {
    constructor(element, name, strings) {
        this.value = undefined;
        this.__pendingValue = undefined;
        if (strings.length !== 2 || strings[0] !== '' || strings[1] !== '') {
            throw new Error('Boolean attributes can only contain a single expression');
        }
        this.element = element;
        this.name = name;
        this.strings = strings;
    }
    setValue(value) {
        this.__pendingValue = value;
    }
    commit() {
        while (isDirective(this.__pendingValue)) {
            const directive = this.__pendingValue;
            this.__pendingValue = noChange;
            directive(this);
        }
        if (this.__pendingValue === noChange) {
            return;
        }
        const value = !!this.__pendingValue;
        if (this.value !== value) {
            if (value) {
                this.element.setAttribute(this.name, '');
            }
            else {
                this.element.removeAttribute(this.name);
            }
            this.value = value;
        }
        this.__pendingValue = noChange;
    }
}
/**
 * Sets attribute values for PropertyParts, so that the value is only set once
 * even if there are multiple parts for a property.
 *
 * If an expression controls the whole property value, then the value is simply
 * assigned to the property under control. If there are string literals or
 * multiple expressions, then the strings are expressions are interpolated into
 * a string first.
 */
class PropertyCommitter extends AttributeCommitter {
    constructor(element, name, strings) {
        super(element, name, strings);
        this.single =
            (strings.length === 2 && strings[0] === '' && strings[1] === '');
    }
    _createPart() {
        return new PropertyPart(this);
    }
    _getValue() {
        if (this.single) {
            return this.parts[0].value;
        }
        return super._getValue();
    }
    commit() {
        if (this.dirty) {
            this.dirty = false;
            // tslint:disable-next-line:no-any
            this.element[this.name] = this._getValue();
        }
    }
}
class PropertyPart extends AttributePart {
}
// Detect event listener options support. If the `capture` property is read
// from the options object, then options are supported. If not, then the thrid
// argument to add/removeEventListener is interpreted as the boolean capture
// value so we should only pass the `capture` property.
let eventOptionsSupported = false;
try {
    const options = {
        get capture() {
            eventOptionsSupported = true;
            return false;
        }
    };
    // tslint:disable-next-line:no-any
    window.addEventListener('test', options, options);
    // tslint:disable-next-line:no-any
    window.removeEventListener('test', options, options);
}
catch (_e) {
}
class EventPart {
    constructor(element, eventName, eventContext) {
        this.value = undefined;
        this.__pendingValue = undefined;
        this.element = element;
        this.eventName = eventName;
        this.eventContext = eventContext;
        this.__boundHandleEvent = (e) => this.handleEvent(e);
    }
    setValue(value) {
        this.__pendingValue = value;
    }
    commit() {
        while (isDirective(this.__pendingValue)) {
            const directive = this.__pendingValue;
            this.__pendingValue = noChange;
            directive(this);
        }
        if (this.__pendingValue === noChange) {
            return;
        }
        const newListener = this.__pendingValue;
        const oldListener = this.value;
        const shouldRemoveListener = newListener == null ||
            oldListener != null &&
                (newListener.capture !== oldListener.capture ||
                    newListener.once !== oldListener.once ||
                    newListener.passive !== oldListener.passive);
        const shouldAddListener = newListener != null && (oldListener == null || shouldRemoveListener);
        if (shouldRemoveListener) {
            this.element.removeEventListener(this.eventName, this.__boundHandleEvent, this.__options);
        }
        if (shouldAddListener) {
            this.__options = getOptions(newListener);
            this.element.addEventListener(this.eventName, this.__boundHandleEvent, this.__options);
        }
        this.value = newListener;
        this.__pendingValue = noChange;
    }
    handleEvent(event) {
        if (typeof this.value === 'function') {
            this.value.call(this.eventContext || this.element, event);
        }
        else {
            this.value.handleEvent(event);
        }
    }
}
// We copy options because of the inconsistent behavior of browsers when reading
// the third argument of add/removeEventListener. IE11 doesn't support options
// at all. Chrome 41 only reads `capture` if the argument is an object.
const getOptions = (o) => o &&
    (eventOptionsSupported ?
        { capture: o.capture, passive: o.passive, once: o.once } :
        o.capture);

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * Creates Parts when a template is instantiated.
 */
class DefaultTemplateProcessor {
    /**
     * Create parts for an attribute-position binding, given the event, attribute
     * name, and string literals.
     *
     * @param element The element containing the binding
     * @param name  The attribute name
     * @param strings The string literals. There are always at least two strings,
     *   event for fully-controlled bindings with a single expression.
     */
    handleAttributeExpressions(element, name, strings, options) {
        const prefix = name[0];
        if (prefix === '.') {
            const committer = new PropertyCommitter(element, name.slice(1), strings);
            return committer.parts;
        }
        if (prefix === '@') {
            return [new EventPart(element, name.slice(1), options.eventContext)];
        }
        if (prefix === '?') {
            return [new BooleanAttributePart(element, name.slice(1), strings)];
        }
        const committer = new AttributeCommitter(element, name, strings);
        return committer.parts;
    }
    /**
     * Create parts for a text-position binding.
     * @param templateFactory
     */
    handleTextExpression(options) {
        return new NodePart(options);
    }
}
const defaultTemplateProcessor = new DefaultTemplateProcessor();

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * The default TemplateFactory which caches Templates keyed on
 * result.type and result.strings.
 */
function templateFactory(result) {
    let templateCache = templateCaches.get(result.type);
    if (templateCache === undefined) {
        templateCache = {
            stringsArray: new WeakMap(),
            keyString: new Map()
        };
        templateCaches.set(result.type, templateCache);
    }
    let template = templateCache.stringsArray.get(result.strings);
    if (template !== undefined) {
        return template;
    }
    // If the TemplateStringsArray is new, generate a key from the strings
    // This key is shared between all templates with identical content
    const key = result.strings.join(marker);
    // Check if we already have a Template for this key
    template = templateCache.keyString.get(key);
    if (template === undefined) {
        // If we have not seen this key before, create a new Template
        template = new Template(result, result.getTemplateElement());
        // Cache the Template for this key
        templateCache.keyString.set(key, template);
    }
    // Cache all future queries for this TemplateStringsArray
    templateCache.stringsArray.set(result.strings, template);
    return template;
}
const templateCaches = new Map();

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const parts = new WeakMap();
/**
 * Renders a template to a container.
 *
 * To update a container with new values, reevaluate the template literal and
 * call `render` with the new result.
 *
 * @param result a TemplateResult created by evaluating a template tag like
 *     `html` or `svg`.
 * @param container A DOM parent to render to. The entire contents are either
 *     replaced, or efficiently updated if the same result type was previous
 *     rendered there.
 * @param options RenderOptions for the entire render tree rendered to this
 *     container. Render options must *not* change between renders to the same
 *     container, as those changes will not effect previously rendered DOM.
 */
const render = (result, container, options) => {
    let part = parts.get(container);
    if (part === undefined) {
        removeNodes(container, container.firstChild);
        parts.set(container, part = new NodePart(Object.assign({ templateFactory }, options)));
        part.appendInto(container);
    }
    part.setValue(result);
    part.commit();
};

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
// IMPORTANT: do not change the property name or the assignment expression.
// This line will be used in regexes to search for lit-html usage.
// TODO(justinfagnani): inject version number at build time
(window['litHtmlVersions'] || (window['litHtmlVersions'] = [])).push('1.0.0');
/**
 * Interprets a template literal as an HTML template that can efficiently
 * render to and update a container.
 */
const html = (strings, ...values) => new TemplateResult(strings, values, 'html', defaultTemplateProcessor);

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
if (typeof window.ShadyCSS === 'undefined') ;
else if (typeof window.ShadyCSS.prepareTemplateDom === 'undefined') {
    console.warn(`Incompatible ShadyCSS version detected. ` +
        `Please update to at least @webcomponents/webcomponentsjs@2.0.2 and ` +
        `@webcomponents/shadycss@1.3.1.`);
}

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * When using Closure Compiler, JSCompiler_renameProperty(property, object) is
 * replaced at compile time by the munged name for object[property]. We cannot
 * alias this function, so we have to use a small shim that has the same
 * behavior when not compiling.
 */
window.JSCompiler_renameProperty =
    (prop, _obj) => prop;

/**
@license
Copyright (c) 2019 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at
http://polymer.github.io/LICENSE.txt The complete set of authors may be found at
http://polymer.github.io/AUTHORS.txt The complete set of contributors may be
found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by Google as
part of the polymer project is also subject to an additional IP rights grant
found at http://polymer.github.io/PATENTS.txt
*/
const supportsAdoptingStyleSheets = ('adoptedStyleSheets' in Document.prototype) &&
    ('replace' in CSSStyleSheet.prototype);

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
// IMPORTANT: do not change the property name or the assignment expression.
// This line will be used in regexes to search for LitElement usage.
// TODO(justinfagnani): inject version number at build time
(window['litElementVersions'] || (window['litElementVersions'] = []))
    .push('2.2.0');

var getDesigntimePropertyAsArray = value => {
	const m = /\$([-a-z0-9A-Z._]+)(?::([^$]*))?\$/.exec(value);
	return m && m[2] ? m[2].split(/,/) : null;
};

let initialized = false;

const CONFIGURATION = {
	theme: "sap_fiori_3",
	rtl: null,
	language: null,
	compactSize: false,
	supportedLanguages: null,
	calendarType: null,
	derivedRTL: null,
	"xx-wc-no-conflict": false, // no URL
};

/* General settings */
const getTheme = () => {
	initConfiguration();
	return CONFIGURATION.theme;
};

const getRTL = () => {
	initConfiguration();
	return CONFIGURATION.rtl;
};

const getLanguage = () => {
	initConfiguration();
	return CONFIGURATION.language;
};

const getCompactSize = () => {
	initConfiguration();
	return CONFIGURATION.compactSize;
};

const getWCNoConflict = () => {
	initConfiguration();
	return CONFIGURATION["xx-wc-no-conflict"];
};

const booleanMapping = new Map();
booleanMapping.set("true", true);
booleanMapping.set("false", false);

let runtimeConfig = {};

const parseConfigurationScript = () => {
	const configScript = document.querySelector("[data-id='sap-ui-config']");
	let configJSON;

	if (configScript) {
		try {
			configJSON = JSON.parse(configScript.innerHTML);
		} catch (е) {
			console.warn("Incorrect data-sap-ui-config format. Please use JSON"); /* eslint-disable-line */
		}

		if (configJSON) {
			runtimeConfig = Object.assign({}, configJSON);
		}
	}
};

const parseURLParameters = () => {
	const params = new URLSearchParams(window.location.search);

	params.forEach((value, key) => {
		if (!key.startsWith("sap-ui")) {
			return;
		}

		const lowerCaseValue = value.toLowerCase();

		const param = key.split("sap-ui-")[1];

		if (booleanMapping.has(value)) {
			value = booleanMapping.get(lowerCaseValue);
		}

		runtimeConfig[param] = value;
	});
};

const applyConfigurations = () => {
	Object.keys(runtimeConfig).forEach(key => {
		CONFIGURATION[key] = runtimeConfig[key];
	});
};

const initConfiguration = () => {
	if (initialized) {
		return;
	}

	parseConfigurationScript();
	parseURLParameters();
	applyConfigurations();

	initialized = true;
};

const whenDOMReady = () => {
	return new Promise(resolve => {
		if (document.body) {
			resolve();
		} else {
			document.addEventListener("DOMContentLoaded", () => {
				resolve();
			});
		}
	});
};

const EventEnrichment = {};

let enriched = false;

EventEnrichment.run = function run() {
	if (enriched) {
		return;
	}

	const stopPropagationSet = new WeakSet();
	const stopImmediatePropagationSet = new WeakSet();

	const originalStopPropagation = Event.prototype.stopPropagation;
	const originalStopImmediatePropagation = Event.prototype.stopImmediatePropagation;

	Event.prototype.stopPropagation = function stopPropagation() {
		stopPropagationSet.add(this);
		return originalStopPropagation.apply(this, arguments); // eslint-disable-line
	};

	Event.prototype.isPropagationStopped = function isPropagationStopped() {
		return stopPropagationSet.has(this);
	};

	Event.prototype.stopImmediatePropagation = function stopImmediatePropagation() {
		stopImmediatePropagationSet.add(this);
		return originalStopImmediatePropagation.apply(this, arguments); // eslint-disable-line
	};

	Event.prototype.isImmediatePropagationStopped = function isImmediatePropagationStopped() {
		return stopImmediatePropagationSet.has(this);
	};

	enriched = true;
};

/**
 * CSS font family used for the icons provided by SAP.
 */
const SAP_ICON_FONT_FAMILY = "SAP-icons";

/* CDN Location */
let iconFontWoff = "https://ui5.sap.com/sdk/resources/sap/ui/core/themes/base/fonts/SAP-icons.woff?ui5-webcomponents";
let iconFontWoff2 = "https://ui5.sap.com/sdk/resources/sap/ui/core/themes/base/fonts/SAP-icons.woff2?ui5-webcomponents";


const insertIconFontFace = (woff2Location = iconFontWoff2, woffLocation = iconFontWoff) => {
	const fontFace = SAP_ICON_FONT_FAMILY;

	/* eslint-disable */
	// load the font asynchronously via CSS
	const fontFaceCSS = "@font-face {" +
			"font-family: '" + fontFace + "';" +
			"src: url('" + woff2Location + "') format('woff2')," + /* Chrome 36+, Firefox 39+, Safari 10+, Edge 14+, Chrome 51+ for Android, PhantomJS 2.1.1+ */
			"url('" + woffLocation + "') format('woff')," + /* IE9+, Safari 5.1+, iOS 5.1+, Android Browser 4.4+, IE Mobile 11+ */
			"local('" + fontFace + "');" + /* fallback to local installed font in case it can't be loaded (e.g. font download is disabled due to browser security settings) */
			"font-weight: normal;" +
			"font-style: normal;" +
			"}";
	/* eslint-enable */

	const style = document.createElement("style");
	style.type = "text/css";
	style.textContent = fontFaceCSS;
	document.head.appendChild(style);
};

const ManagedEvents = {};

ManagedEvents.events = [
	"click",
	"dblclick",
	"contextmenu",
	"keydown",
	"keypress",
	"keyup",
	"mousedown",
	"mouseout",
	"mouseover",
	"mouseup",
	"select",
	"selectstart",
	"dragstart",
	"dragenter",
	"dragover",
	"dragleave",
	"dragend",
	"drop",
	"paste",
	"cut",
	"input",
	"touchstart",
	"touchend",
	"touchmove",
	"touchcancel",
];

ManagedEvents.bindAllEvents = callback => {
	if (callback) {
		ManagedEvents.events.forEach(event => {
			document.addEventListener(event, callback);
		});
	}
};

ManagedEvents.unbindAllEvents = callback => {
	if (callback) {
		ManagedEvents.events.forEach(event => {
			document.removeEventListener(event, callback);
		});
	}
};

const getShadowDOMTarget = event => {
	// Default - composedPath should be used (also covered by polyfill)
	if (typeof event.composedPath === "function") {
		const composedPath = event.composedPath();
		if (Array.isArray(composedPath) && composedPath.length) {
			return composedPath[0];
		}
	}

	// Fallback
	return event.target;
};

const handleEvent = function handleEvent(event) {
	// Get the DOM node where the original event occurred
	let target = getShadowDOMTarget(event);

	// Traverse the DOM
	let shouldPropagate = true;
	while (shouldPropagate && target instanceof HTMLElement) {
		shouldPropagate = processDOMNode(target, event);
		if (shouldPropagate) {
			target = getParentDOMNode(target);
		}
	}
};


const processDOMNode = function processDOMNode(node, event) {
	if (node && node._isUI5Element) {
		return dispatchEvent(node, event);
	}
	return true;
};

const dispatchEvent = function dispatchEvent(element, event) {
	// Handle the original event (such as "keydown")
	element._handleEvent(event);
	if (event.isImmediatePropagationStopped()) {
		return false;
	}

	/* eslint-disable */
	if (event.isPropagationStopped()) {
		return false;
	}
	/* eslint-enable */

	return true;
};

const getParentDOMNode = function getParentDOMNode(node) {
	const parentNode = node.parentNode;

	if (parentNode && parentNode.host) {
		return parentNode.host;
	}

	return parentNode;
};

const isOtherInstanceRegistered = () => {
	return window["@ui5/webcomponents-base/DOMEventHandler"];
};

const registerInstance = () => {
	window["@ui5/webcomponents-base/DOMEventHandler"] = true;
};

class DOMEventHandler {
	constructor() {
		throw new Error("Static class");
	}

	static start() {
		// register the handlers just once in case other bundles include and call this method multiple times
		if (!isOtherInstanceRegistered()) {
			ManagedEvents.bindAllEvents(handleEvent);
			registerInstance();
		}
	}

	static stop() {
		ManagedEvents.unbindAllEvents(handleEvent);
	}
}

const customCSSFor = {};

const getCustomCSS = tag => {
	return customCSSFor[tag] ? customCSSFor[tag].join("") : "";
};

const fetchPromises = new Map();
const textPromises = new Map();

const fetchTextOnce = async url => {
	if (!fetchPromises.get(url)) {
		fetchPromises.set(url, fetch(url));
	}
	const response = await fetchPromises.get(url);

	if (!textPromises.get(url)) {
		textPromises.set(url, response.text());
	}

	return textPromises.get(url);
};

const themeURLs = new Map();
const propertiesStyles = new Map();

const getThemeProperties = async (packageName, themeName) => {
	const style = propertiesStyles.get(`${packageName}_${themeName}`);
	if (style) {
		return style;
	}

	const data = await fetchThemeProperties(packageName, themeName);
	propertiesStyles.set(`${packageName}_${themeName}`, data);
	return data;
};

const fetchThemeProperties = async (packageName, themeName) => {
	const url = themeURLs.get(`${packageName}_${themeName}`);

	if (!url) {
		throw new Error(`You have to import @ui5/webcomponents/dist/ThemePropertiesProvider module to use theme switching`);
	}
	return fetchTextOnce(url);
};

/**
 * Creates a <style> tag in the <head> tag
 * @param cssText - the CSS
 * @param attributes - optional attributes to add to the tag
 * @returns {HTMLElement}
 */
const createStyleInHead = (cssText, attributes = {}) => {
	const style = document.createElement("style");
	style.type = "text/css";

	Object.entries(attributes).forEach(pair => style.setAttribute(...pair));

	style.textContent = cssText;
	document.head.appendChild(style);
	return style;
};

const injectedForTags = [];
let ponyfillTimer;

const ponyfillNeeded = () => !!window.CSSVarsPonyfill;

const runPonyfill = () => {
	ponyfillTimer = undefined;

	window.CSSVarsPonyfill.resetCssVars();
	window.CSSVarsPonyfill.cssVars({
		rootElement: document.head,
		include: "style[data-ui5-webcomponents-theme-properties],style[data-ui5-webcomponent-styles]",
		silent: true,
	});
};

const schedulePonyfill = () => {
	if (!ponyfillTimer) {
		ponyfillTimer = window.setTimeout(runPonyfill, 0);
	}
};

/**
 * Creates/updates a style element holding all CSS Custom Properties
 * @param cssText
 */
const injectThemeProperties = cssText => {
	// Needed for all browsers
	const styleElement = document.head.querySelector(`style[data-ui5-webcomponents-theme-properties]`);
	if (styleElement) {
		styleElement.textContent = cssText || "";	// in case of undefined
	} else {
		createStyleInHead(cssText, { "data-ui5-webcomponents-theme-properties": "" });
	}

	// When changing the theme, run the ponyfill immediately
	if (ponyfillNeeded()) {
		runPonyfill();
	}
};

/**
 * Creates a style element holding the CSS for a web component (and resolves CSS Custom Properties for IE)
 * @param tagName
 * @param cssText
 */
const injectWebComponentStyle = (tagName, cssText) => {
	// Edge and IE
	if (injectedForTags.indexOf(tagName) !== -1) {
		return;
	}
	createStyleInHead(cssText, {
		"data-ui5-webcomponent-styles": tagName,
		"disabled": "disabled",
	});
	injectedForTags.push(tagName);

	// When injecting component styles, more might come in the same tick, so run the ponyfill async (to avoid double work)
	if (ponyfillNeeded()) {
		schedulePonyfill();
	}
};

const getDefaultTheme = () => {
	return "sap_fiori_3";
};

const attachThemeChange = function attachThemeChange(callback) {
};

const applyTheme = async () => {
	let cssText = "";
	const theme = getTheme();

	const defaultTheme = getDefaultTheme();
	if (theme !== defaultTheme) {
		cssText = await getThemeProperties("@ui5/webcomponents", theme);
	}
	injectThemeProperties(cssText);
};

const getEffectiveStyle = ElementClass => {
	const tag = ElementClass.getMetadata().getTag();
	const customStyle = getCustomCSS(tag) || "";
	let componentStyles = ElementClass.styles;

	if (Array.isArray(componentStyles)) {
		componentStyles = componentStyles.join(" ");
	}
	return `${componentStyles} ${customStyle}`;
};

let polyfillLoadedPromise;

const whenPolyfillLoaded = () => {
	if (polyfillLoadedPromise) {
		return polyfillLoadedPromise;
	}

	polyfillLoadedPromise = new Promise(resolve => {
		if (window.WebComponents && window.WebComponents.waitFor) {
			// the polyfill loader is present
			window.WebComponents.waitFor(() => {
				// the polyfills are loaded, safe to execute code depending on their APIs
				resolve();
			});
		} else {
			// polyfill loader missing, modern browsers only
			resolve();
		}
	});

	return polyfillLoadedPromise;
};

EventEnrichment.run();

let bootPromise;

const boot = () => {
	if (bootPromise) {
		return bootPromise;
	}

	bootPromise = new Promise(async resolve => {
		await whenDOMReady();
		applyTheme();
		insertIconFontFace();
		DOMEventHandler.start();
		await whenPolyfillLoaded();
		resolve();
	});

	return bootPromise;
};

// Shorthands
const w = window;

// Map of observer objects per dom node
const observers = new WeakMap();

/**
 * Implements universal DOM node observation methods.
 */
class DOMObserver {
	constructor() {
		throw new Error("Static class");
	}

	/**
	 * This function abstracts out mutation observer usage inside shadow DOM.
	 * For native shadow DOM the native mutation observer is used.
	 * When the polyfill is used, the observeChildren ShadyDOM method is used instead.
	 *
	 * @throws Exception
	 * Note: does not allow several mutation observers per node. If there is a valid use-case, this behavior can be changed.
	 *
	 * @param node
	 * @param callback
	 * @param options - Only used for the native mutation observer
	 */
	static observeDOMNode(node, callback, options) {
		let observerObject = observers.get(node);
		if (observerObject) {
			throw new Error("A mutation/ShadyDOM observer is already assigned to this node.");
		}

		if (w.ShadyDOM) {
			observerObject = w.ShadyDOM.observeChildren(node, callback);
		} else {
			observerObject = new MutationObserver(callback);
			observerObject.observe(node, options);
		}

		observers.set(node, observerObject);
	}

	/**
	 * De-registers the mutation observer, depending on its type
	 * @param node
	 */
	static unobserveDOMNode(node) {
		const observerObject = observers.get(node);
		if (!observerObject) {
			return;
		}

		if (observerObject instanceof MutationObserver) {
			observerObject.disconnect();
		} else {
			w.ShadyDOM.unobserveChildren(observerObject);
		}
		observers.delete(node);
	}
}

/**
 * Base class for all data types.
 *
 * @class
 * @constructor
 * @author SAP SE
 * @alias sap.ui.webcomponents.base.types.DataType
 * @public
 */
class DataType {
	static isValid(value) {
	}

	static generataTypeAcessors(types) {
		Object.keys(types).forEach(type => {
			Object.defineProperty(this, type, {
				get() {
					return types[type];
				},
			});
		});
	}
}

const isDescendantOf = (klass, baseKlass, inclusive = false) => {
	if (typeof klass !== "function" || typeof baseKlass !== "function") {
		return false;
	}
	if (inclusive && klass === baseKlass) {
		return true;
	}
	let parent = klass;
	do {
		parent = Object.getPrototypeOf(parent);
	} while (parent !== null && parent !== baseKlass);
	return parent === baseKlass;
};

class UI5ElementMetadata {
	constructor(metadata) {
		this.metadata = metadata;
	}

	getTag() {
		return this.metadata.tag;
	}

	getPropsList() {
		return Object.keys(this.getProperties());
	}

	getPublicPropsList() {
		return this.getPropsList().filter(UI5ElementMetadata.isPublicProperty);
	}

	getSlots() {
		return this.metadata.slots || {};
	}

	hasSlots() {
		return !!Object.entries(this.getSlots()).length;
	}

	getProperties() {
		return this.metadata.properties || {};
	}

	getEvents() {
		return this.metadata.events || {};
	}

	static isPublicProperty(prop) {
		return prop.charAt(0) !== "_";
	}

	static validatePropertyValue(value, propData) {
		const isMultiple = propData.multiple;
		if (isMultiple) {
			return value.map(propValue => validateSingleProperty(propValue, propData));
		}
		return validateSingleProperty(value, propData);
	}

	static validateSlotValue(value, slotData) {
		return validateSingleSlot(value, slotData);
	}
}

const validateSingleProperty = (value, propData) => {
	const propertyType = propData.type;

	// Association handling
	if (propData.association) {
		return value;
	}

	if (propertyType === Boolean) {
		return typeof value === "boolean" ? value : false;
	}
	if (propertyType === String) {
		return (typeof value === "string" || typeof value === "undefined" || value === null) ? value : value.toString();
	}
	if (propertyType === Object) {
		return typeof value === "object" ? value : propData.defaultValue;
	}
	if (isDescendantOf(propertyType, DataType)) {
		return propertyType.isValid(value) ? value : propData.defaultValue;
	}
};

const validateSingleSlot = (value, slotData) => {
	if (value === null) {
		return value;
	}

	const getSlottedNodes = el => {
		const isTag = el instanceof HTMLElement;
		const isSlot = isTag && el.tagName.toUpperCase() === "SLOT";

		if (isSlot) {
			return el.assignedNodes({ flatten: true }).filter(item => item instanceof HTMLElement);
		}

		return [el];
	};
	const propertyType = slotData.type;

	const slottedNodes = getSlottedNodes(value);
	slottedNodes.forEach(el => {
		if (!(el instanceof propertyType)) {
			const isHTMLElement = el instanceof HTMLElement;
			const tagName = isHTMLElement && el.tagName.toLowerCase();
			const isCustomElement = isHTMLElement && tagName.includes("-");
			if (isCustomElement) {
				window.customElements.whenDefined(tagName).then(() => {
					if (!(el instanceof propertyType)) {
						throw new Error(`${el} is not of type ${propertyType}`);
					}
				});
			}
		}
	});

	return value;
};

class Integer extends DataType {
	static isValid(value) {
		return Number.isInteger(value);
	}
}

class RenderQueue {
	constructor() {
		this.list = []; // Used to store the web components in order
		this.promises = new Map(); // Used to store promises for web component rendering
	}

	add(webComponent) {
		if (this.promises.has(webComponent)) {
			return this.promises.get(webComponent);
		}

		let deferredResolve;
		const promise = new Promise(resolve => {
			deferredResolve = resolve;
		});
		promise._deferredResolve = deferredResolve;

		this.list.push(webComponent);
		this.promises.set(webComponent, promise);

		return promise;
	}

	shift() {
		const webComponent = this.list.shift();
		if (webComponent) {
			const promise = this.promises.get(webComponent);
			this.promises.delete(webComponent);
			return { webComponent, promise };
		}
	}

	getList() {
		return this.list;
	}

	isAdded(webComponent) {
		return this.promises.has(webComponent);
	}
}

const MAX_RERENDER_COUNT = 10;

// Tells whether a render task is currently scheduled
let renderTaskId;

// Queue for invalidated web components
const invalidatedWebComponents = new RenderQueue();

let renderTaskPromise,
	renderTaskPromiseResolve,
	taskResult;

/**
 * Class that manages the rendering/re-rendering of web components
 * This is always asynchronous
 */
class RenderScheduler {
	constructor() {
		throw new Error("Static class");
	}

	/**
	 * Queues a web component for re-rendering
	 * @param webComponent
	 */
	static renderDeferred(webComponent) {
		// Enqueue the web component
		const res = invalidatedWebComponents.add(webComponent);

		// Schedule a rendering task
		RenderScheduler.scheduleRenderTask();
		return res;
	}

	static renderImmediately(webComponent) {
		// Enqueue the web component
		const res = invalidatedWebComponents.add(webComponent);

		// Immediately start a render task
		RenderScheduler.runRenderTask();
		return res;
	}

	/**
	 * Schedules a rendering task, if not scheduled already
	 */
	static scheduleRenderTask() {
		if (!renderTaskId) {
			// renderTaskId = window.setTimeout(RenderScheduler.renderWebComponents, 3000); // Task
			// renderTaskId = Promise.resolve().then(RenderScheduler.renderWebComponents); // Micro task
			renderTaskId = window.requestAnimationFrame(RenderScheduler.renderWebComponents); // AF
		}
	}

	static runRenderTask() {
		if (!renderTaskId) {
			renderTaskId = 1; // prevent another rendering task from being scheduled, all web components should use this task
			RenderScheduler.renderWebComponents();
		}
	}

	static renderWebComponents() {
		// console.log("------------- NEW RENDER TASK ---------------");

		let webComponentInfo,
			webComponent,
			promise;
		const renderStats = new Map();
		while (webComponentInfo = invalidatedWebComponents.shift()) { // eslint-disable-line
			webComponent = webComponentInfo.webComponent;
			promise = webComponentInfo.promise;

			const timesRerendered = renderStats.get(webComponent) || 0;
			if (timesRerendered > MAX_RERENDER_COUNT) {
				// console.warn("WARNING RERENDER", webComponent);
				throw new Error(`Web component re-rendered too many times this task, max allowed is: ${MAX_RERENDER_COUNT}`);
			}
			webComponent._render();
			promise._deferredResolve();
			renderStats.set(webComponent, timesRerendered + 1);
		}

		// wait for Mutation observer just in case
		setTimeout(() => {
			if (invalidatedWebComponents.getList().length === 0) {
				RenderScheduler._resolveTaskPromise();
			}
		}, 200);

		renderTaskId = undefined;
	}

	/**
	 * return a promise that will be resolved once all invalidated web components are rendered
	 */
	static whenDOMUpdated() {
		if (renderTaskPromise) {
			return renderTaskPromise;
		}

		renderTaskPromise = new Promise(resolve => {
			renderTaskPromiseResolve = resolve;
			window.requestAnimationFrame(() => {
				if (invalidatedWebComponents.getList().length === 0) {
					renderTaskPromise = undefined;
					resolve();
				}
			});
		});

		return renderTaskPromise;
	}

	static getNotDefinedComponents() {
		return Array.from(document.querySelectorAll(":not(:defined)")).filter(el => el.localName.startsWith("ui5-"));
	}

	/**
	 * return a promise that will be resolved once all ui5 webcomponents on the page have their shadow root ready
	 */
	static async whenShadowDOMReady() {
		const undefinedElements = this.getNotDefinedComponents();

		const definedPromises = undefinedElements.map(
		  el => customElements.whenDefined(el.localName)
		);
		const timeoutPromise = new Promise(resolve => setTimeout(resolve, 5000));

		await Promise.race([Promise.all(definedPromises), timeoutPromise]);
		const stillUndefined = this.getNotDefinedComponents();
		if (stillUndefined.length) {
			// eslint-disable-next-line
			console.warn("undefined elements after 5 seconds: ", [...stillUndefined].map(el => el.localName));
		}

		// TODO: track promises internally, the dom traversal is a POC only
		const ui5Components = Array.from(document.querySelectorAll("*")).filter(_ => _._shadowRootReadyPromise);
		return Promise.all(ui5Components.map(comp => comp._whenShadowRootReady()))
			.then(() => Promise.resolve());	// qunit has a boolean cheack for the promise value and the array from the Promise all is considered truthy
	}

	static async whenFinished() {
		await RenderScheduler.whenShadowDOMReady();
		await RenderScheduler.whenDOMUpdated();
	}

	static _resolveTaskPromise() {
		if (invalidatedWebComponents.getList().length > 0) {
			// More updates are pending. Resolve will be called again
			return;
		}

		if (renderTaskPromiseResolve) {
			renderTaskPromiseResolve.call(this, taskResult);
			renderTaskPromiseResolve = undefined;
			renderTaskPromise = undefined;
		}
	}
}

const styleMap = new Map();

/**
 * Creates the needed CSS for a web component class in the head tag
 * Note: IE11, Edge
 * @param ElementClass
 */
const createHeadStyle = ElementClass => {
	const tag = ElementClass.getMetadata().getTag();
	const cssContent = getEffectiveStyle(ElementClass);
	injectWebComponentStyle(tag, cssContent);
};

/**
 * Returns (and caches) a constructable style sheet for a web component class
 * Note: Chrome
 * @param ElementClass
 * @returns {*}
 */
const getConstructableStyle = ElementClass => {
	const tagName = ElementClass.getMetadata().getTag();
	const styleContent = getEffectiveStyle(ElementClass);
	const theme = getTheme();
	const key = theme + tagName;
	if (styleMap.has(key)) {
		return styleMap.get(key);
	}

	const style = new CSSStyleSheet();
	style.replaceSync(styleContent);

	styleMap.set(key, style);
	return style;
};

/**
 * Returns the CSS to be injected inside a web component shadow root, or undefined if not needed
 * Note: FF, Safari
 * @param ElementClass
 * @returns {string}
 */
const getShadowRootStyle = ElementClass => {
	if (document.adoptedStyleSheets || window.ShadyDOM) {
		return;
	}

	const styleContent = getEffectiveStyle(ElementClass);
	return styleContent;
};

const kebabToCamelCase = string => toCamelCase(string.split("-"));

const camelToKebabCase = string => string.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

const toCamelCase = parts => {
	return parts.map((string, index) => {
		return index === 0 ? string.toLowerCase() : string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
	}).join("");
};

/**
 * Checks whether a property name is valid (does not collide with existing DOM API properties)
 * Note: disabled is present in IE so we explicitly allow it here.
 *
 * @param name
 * @returns {boolean}
 */
const isValidPropertyName = name => {
	if (name === "disabled") {
		return true;
	}
	const classes = [
		HTMLElement,
		Element,
		Node,
	];
	return !classes.some(klass => klass.prototype.hasOwnProperty(name)); // eslint-disable-line
};

const metadata = {
	events: {
		_propertyChange: {},
	},
};

const DefinitionsSet = new Set();
const IDMap = new Map();

class UI5Element extends HTMLElement {
	constructor() {
		super();
		this._generateId();
		this._initializeState();
		this._upgradeAllProperties();
		this._shadowRootReadyPromise = this._initializeShadowRoot();

		attachThemeChange(this.onThemeChanged.bind(this));

		let deferredResolve;
		this._domRefReadyPromise = new Promise(resolve => {
			deferredResolve = resolve;
		});
		this._domRefReadyPromise._deferredResolve = deferredResolve;

		this._monitoredChildProps = new Map();
	}

	_whenShadowRootReady() {
		return this._shadowRootReadyPromise;
	}

	onThemeChanged() {
		if (window.ShadyDOM || !this.constructor.needsShadowDOM()) {
			// polyfill theme handling is in head styles directly
			return;
		}
		const newStyle = getConstructableStyle(this.constructor);
		if (document.adoptedStyleSheets) {
			this.shadowRoot.adoptedStyleSheets = [newStyle];
		} else {
			const oldStyle = this.shadowRoot.querySelector("style");
			oldStyle.textContent = newStyle.textContent;
		}
	}

	_generateId() {
		this._id = this.constructor._nextID();
	}

	async _initializeShadowRoot() {
		if (!this.constructor.needsShadowDOM()) {
			return Promise.resolve();
		}

		this.attachShadow({ mode: "open" });

		// IE11, Edge
		if (window.ShadyDOM) {
			createHeadStyle(this.constructor);
		}

		// Chrome
		if (document.adoptedStyleSheets) {
			const style = getConstructableStyle(this.constructor);
			this.shadowRoot.adoptedStyleSheets = [style];
		}
	}

	async connectedCallback() {
		const isCompact = getCompactSize();
		if (isCompact) {
			this.setAttribute("data-ui5-compact-size", "");
		}

		if (!this.constructor.needsShadowDOM()) {
			return;
		}

		await this._whenShadowRootReady();
		this._processChildren();
		await RenderScheduler.renderImmediately(this);
		this._domRefReadyPromise._deferredResolve();
		this._startObservingDOMChildren();
		if (typeof this.onEnterDOM === "function") {
			this.onEnterDOM();
		}
	}

	disconnectedCallback() {
		if (!this.constructor.needsShadowDOM()) {
			return;
		}

		this._stopObservingDOMChildren();
		if (typeof this.onExitDOM === "function") {
			this.onExitDOM();
		}
	}

	_startObservingDOMChildren() {
		const shouldObserveChildren = this.constructor.getMetadata().hasSlots();
		if (!shouldObserveChildren) {
			return;
		}
		const mutationObserverOptions = {
			childList: true,
			subtree: true,
			characterData: true,
		};
		DOMObserver.observeDOMNode(this, this._processChildren.bind(this), mutationObserverOptions);
	}

	_stopObservingDOMChildren() {
		DOMObserver.unobserveDOMNode(this);
	}

	onChildrenChanged(mutations) {
	}

	_processChildren(mutations) {
		const hasSlots = this.constructor.getMetadata().hasSlots();
		if (hasSlots) {
			this._updateSlots();
		}
		this.onChildrenChanged(mutations);
	}

	_updateSlots() {
		const slotsMap = this.constructor.getMetadata().getSlots();
		const canSlotText = slotsMap.default && slotsMap.default.type === Node;

		let domChildren;
		if (canSlotText) {
			domChildren = Array.from(this.childNodes);
		} else {
			domChildren = Array.from(this.children);
		}

		// Init the _state object based on the supported slots
		for (const [slotName, slotData] of Object.entries(slotsMap)) { // eslint-disable-line
			this._clearSlot(slotName);
		}

		const autoIncrementMap = new Map();
		domChildren.forEach(child => {
			// Determine the type of the child (mainly by the slot attribute)
			const slotName = this.constructor._getSlotName(child);
			const slotData = slotsMap[slotName];

			// Check if the slotName is supported
			if (slotData === undefined) {
				const validValues = Object.keys(slotsMap).join(", ");
				console.warn(`Unknown slotName: ${slotName}, ignoring`, child, `Valid values are: ${validValues}`); // eslint-disable-line
				return;
			}

			// For children that need individual slots, calculate them
			if (slotData.individualSlots) {
				const nextId = (autoIncrementMap.get(slotName) || 0) + 1;
				autoIncrementMap.set(slotName, nextId);
				child._individualSlot = `${slotName}-${nextId}`;
			}

			child = this.constructor.getMetadata().constructor.validateSlotValue(child, slotData);

			if (child._isUI5Element) {
				this._attachChildPropertyUpdated(child, slotData);
			}

			// Distribute the child in the _state object
			const propertyName = slotData.propertyName || slotName;
			this._state[propertyName].push(child);
		});

		this._invalidate();
	}

	// Removes all children from the slot and detaches listeners, if any
	_clearSlot(slotName) {
		const slotData = this.constructor.getMetadata().getSlots()[slotName];
		const propertyName = slotData.propertyName || slotName;

		let children = this._state[propertyName];
		if (!Array.isArray(children)) {
			children = [children];
		}

		children.forEach(child => {
			if (child && child._isUI5Element) {
				this._detachChildPropertyUpdated(child);
			}
		});

		this._state[propertyName] = [];
	}

	static get observedAttributes() {
		const observedProps = this.getMetadata().getPublicPropsList();
		return observedProps.map(camelToKebabCase);
	}

	attributeChangedCallback(name, oldValue, newValue) {
		const properties = this.constructor.getMetadata().getProperties();
		const realName = name.replace(/^ui5-/, "");
		const nameInCamelCase = kebabToCamelCase(realName);
		if (properties.hasOwnProperty(nameInCamelCase)) { // eslint-disable-line
			const propertyTypeClass = properties[nameInCamelCase].type;
			if (propertyTypeClass === Boolean) {
				newValue = newValue !== null;
			}
			if (propertyTypeClass === Integer) {
				newValue = parseInt(newValue);
			}
			this[nameInCamelCase] = newValue;
		}
	}

	_updateAttribute(name, newValue) {
		if (!UI5ElementMetadata.isPublicProperty(name)) {
			return;
		}

		if (typeof newValue === "object") {
			return;
		}

		const attrName = camelToKebabCase(name);
		const attrValue = this.getAttribute(attrName);
		if (typeof newValue === "boolean") {
			if (newValue === true && attrValue === null) {
				this.setAttribute(attrName, "");
			} else if (newValue === false && attrValue !== null) {
				this.removeAttribute(attrName);
			}
		} else if (attrValue !== newValue) {
			this.setAttribute(attrName, newValue);
		}
	}

	_upgradeProperty(prop) {
		if (this.hasOwnProperty(prop)) { // eslint-disable-line
			const value = this[prop];
			delete this[prop];
			this[prop] = value;
		}
	}

	_upgradeAllProperties() {
		const allProps = this.constructor.getMetadata().getPropsList();
		allProps.forEach(this._upgradeProperty.bind(this));
	}

	static async define() {
		await boot();
		const tag = this.getMetadata().getTag();

		const definedLocally = DefinitionsSet.has(tag);
		const definedGlobally = customElements.get(tag);

		if (definedGlobally && !definedLocally) {
			console.warn(`Skipping definition of tag ${tag}, because it was already defined by another instance of ui5-webcomponents.`); // eslint-disable-line
		} else if (!definedGlobally) {
			this.generateAccessors();
			DefinitionsSet.add(tag);
			window.customElements.define(tag, this);
		}
		return this;
	}

	static get metadata() {
		return metadata;
	}

	static get styles() {
		return "";
	}

	_initializeState() {
		const defaultState = this.constructor._getDefaultState();
		this._state = Object.assign({}, defaultState);
		this._delegates = [];
	}

	static getMetadata() {
		let klass = this; // eslint-disable-line

		if (klass.hasOwnProperty("_metadata")) { // eslint-disable-line
			return klass._metadata;
		}

		const metadatas = [Object.assign(klass.metadata, {})];
		while (klass !== UI5Element) {
			klass = Object.getPrototypeOf(klass);
			metadatas.push(klass.metadata);
		}

		const result = metadatas[0];

		// merge properties
		result.properties = metadatas.reverse().reduce((result, current) => { // eslint-disable-line
			Object.assign(result, current.properties);
			return result;
		}, {});

		// merge slots
		result.slots = metadatas.reverse().reduce((result, current) => { // eslint-disable-line
			Object.assign(result, current.slots);
			return result;
		}, {});

		// merge events
		result.events = metadatas.reverse().reduce((result, current) => { // eslint-disable-line
			Object.assign(result, current.events);
			return result;
		}, {});

		this._metadata = new UI5ElementMetadata(result);
		return this._metadata;
	}

	_attachChildPropertyUpdated(child, propData) {
		const listenFor = propData.listenFor,
			childMetadata = child.constructor.getMetadata(),
			slotName = this.constructor._getSlotName(child), // all slotted children have the same configuration
			childProperties = childMetadata.getProperties();

		let observedProps = [],
			notObservedProps = [];

		if (!listenFor) {
			return;
		}

		if (Array.isArray(listenFor)) {
			observedProps = listenFor;
		} else {
			observedProps = Array.isArray(listenFor.props) ? listenFor.props : Object.keys(childProperties);
			notObservedProps = Array.isArray(listenFor.exclude) ? listenFor.exclude : [];
		}

		if (!this._monitoredChildProps.has(slotName)) {
			this._monitoredChildProps.set(slotName, { observedProps, notObservedProps });
		}

		child.addEventListener("_propertyChange", this._invalidateParentOnPropertyUpdate);
	}

	_detachChildPropertyUpdated(child) {
		child.removeEventListener("_propertyChange", this._invalidateParentOnPropertyUpdate);
	}

	_invalidateParentOnPropertyUpdate(prop) {
		// The web component to be invalidated
		const parentNode = this.parentNode;
		if (!parentNode) {
			return;
		}

		const slotName = parentNode.constructor._getSlotName(this);
		const propsMetadata = parentNode._monitoredChildProps.get(slotName);

		if (!propsMetadata) {
			return;
		}
		const { observedProps, notObservedProps } = propsMetadata;

		if (observedProps.includes(prop.detail.name) && !notObservedProps.includes(prop.detail.name)) {
			parentNode._invalidate("_parent_", this);
		}
	}

	/**
	 * Asynchronously re-renders an already rendered web component
	 * @private
	 */
	_invalidate() {
		if (this._invalidated) {
			return;
		}

		if (this.getDomRef() && !this._suppressInvalidation) {
			this._invalidated = true;
			// console.log("INVAL", this, ...arguments);
			RenderScheduler.renderDeferred(this);
		}
	}

	_render() {
		// Call the onBeforeRendering hook
		if (typeof this.onBeforeRendering === "function") {
			this._suppressInvalidation = true;
			this.onBeforeRendering();
			delete this._suppressInvalidation;
		}

		// Update the shadow root with the render result
		// console.log(this.getDomRef() ? "RE-RENDER" : "FIRST RENDER", this);
		delete this._invalidated;
		this._updateShadowRoot();

		// Safari requires that children get the slot attribute only after the slot tags have been rendered in the shadow DOM
		this._assignIndividualSlotsToChildren();

		// Call the onAfterRendering hook
		if (typeof this.onAfterRendering === "function") {
			this.onAfterRendering();
		}
	}

	_updateShadowRoot() {
		const renderResult = this.constructor.template(this);
		// For browsers that do not support constructable style sheets (and not using the polyfill)
		const styleToPrepend = getShadowRootStyle(this.constructor);
		this.constructor.render(renderResult, this.shadowRoot, styleToPrepend, { eventContext: this });
	}

	_assignIndividualSlotsToChildren() {
		const domChildren = Array.from(this.children);

		domChildren.forEach(child => {
			if (child._individualSlot) {
				child.setAttribute("slot", child._individualSlot);
			}
		});
	}

	getDomRef() {
		if (!this.shadowRoot || this.shadowRoot.children.length === 0) {
			return;
		}

		return this.shadowRoot.children.length === 1
			? this.shadowRoot.children[0] : this.shadowRoot.children[1];
	}

	_waitForDomRef() {
		return this._domRefReadyPromise;
	}

	getFocusDomRef() {
		const domRef = this.getDomRef();
		if (domRef) {
			const focusRef = domRef.querySelector("[data-sap-focus-ref]");
			return focusRef || domRef;
		}
	}

	async focus() {
		await this._waitForDomRef();

		const focusDomRef = this.getFocusDomRef();

		if (focusDomRef) {
			focusDomRef.focus();
		}
	}

	/**
	 * Calls the event handler on the web component for a native event
	 *
	 * @param event The event object
	 * @private
	 */
	_handleEvent(event) {
		const sHandlerName = `on${event.type}`;

		this._delegates.forEach(delegate => {
			if (delegate[sHandlerName]) {
				delegate[sHandlerName](event);
			}
		});

		if (this[sHandlerName]) {
			this[sHandlerName](event);
		}
	}

	_propertyChange(name, value) {
		this._updateAttribute(name, value);

		const customEvent = new CustomEvent("_propertyChange", {
			detail: { name, newValue: value },
			composed: false,
			bubbles: true,
		});

		this.dispatchEvent(customEvent);
	}

	/**
	 *
	 * @param name - name of the event
	 * @param data - additional data for the event
	 * @param cancelable - true, if the user can call preventDefault on the event object
	 * @returns {boolean} false, if the event was cancelled (preventDefault called), true otherwise
	 */
	fireEvent(name, data, cancelable) {
		let compatEventResult = true; // Initialized to true, because if the event is not fired at all, it should be considered "not-prevented"
		const noConflict = getWCNoConflict();

		const noConflictEvent = new CustomEvent(`ui5-${name}`, {
			detail: data,
			composed: false,
			bubbles: true,
			cancelable,
		});

		// This will be false if the compat event is prevented
		compatEventResult = this.dispatchEvent(noConflictEvent);

		if (noConflict === true || (noConflict.events && noConflict.events.includes && noConflict.events.includes(name))) {
			return compatEventResult;
		}

		const customEvent = new CustomEvent(name, {
			detail: data,
			composed: false,
			bubbles: true,
			cancelable,
		});

		// This will be false if the normal event is prevented
		const normalEventResult = this.dispatchEvent(customEvent);

		// Return false if any of the two events was prevented (its result was false).
		return normalEventResult && compatEventResult;
	}

	getSlottedNodes(slotName) {
		const reducer = (acc, curr) => {
			if (curr.tagName.toUpperCase() !== "SLOT") {
				return acc.concat([curr]);
			}
			return acc.concat(curr.assignedNodes({ flatten: true }).filter(item => item instanceof HTMLElement));
		};

		return this[slotName].reduce(reducer, []);
	}

	/**
	 * Used to duck-type UI5 elements without using instanceof
	 * @returns {boolean}
	 * @private
	 */
	get _isUI5Element() {
		return true;
	}

	/**
	 * Used to generate the next auto-increment id for the current class
	 * @returns {string}
	 * @private
	 */
	static _nextID() {
		const className = "el";
		const lastNumber = IDMap.get(className);
		const nextNumber = lastNumber !== undefined ? lastNumber + 1 : 1;
		IDMap.set(className, nextNumber);
		return `__${className}${nextNumber}`;
	}

	static _getSlotName(child) {
		// Text nodes can only go to the default slot
		if (!(child instanceof HTMLElement)) {
			return "default";
		}

		// Discover the slot based on the real slot name (f.e. footer => footer, or content-32 => content)
		const slot = child.getAttribute("slot");
		if (slot) {
			const match = slot.match(/^(.+?)-\d+$/);
			return match ? match[1] : slot;
		}

		// Use default slot as a fallback
		return "default";
	}

	static needsShadowDOM() {
		return !!this.template;
	}

	static _getDefaultState() {
		if (this._defaultState) {
			return this._defaultState;
		}

		const MetadataClass = this.getMetadata();
		const defaultState = {};

		// Initialize properties
		const props = MetadataClass.getProperties();
		for (const propName in props) { // eslint-disable-line
			const propType = props[propName].type;
			const propDefaultValue = props[propName].defaultValue;

			if (propType === Boolean) {
				defaultState[propName] = false;

				if (propDefaultValue !== undefined) {
					console.warn("The 'defaultValue' metadata key is ignored for all booleans properties, they would be initialized with 'false' by default"); // eslint-disable-line
				}
			} else if (props[propName].multiple) {
				defaultState[propName] = [];
			} else if (propType === Object) {
				defaultState[propName] = "defaultValue" in props[propName] ? props[propName].defaultValue : {};
			} else if (propType === String) {
				defaultState[propName] = propDefaultValue || "";
			} else {
				defaultState[propName] = propDefaultValue;
			}
		}

		// Initialize slots
		const slots = MetadataClass.getSlots();
		for (const [slotName, slotData] of Object.entries(slots)) { // eslint-disable-line
			const propertyName = slotData.propertyName || slotName;
			defaultState[propertyName] = [];
		}

		this._defaultState = defaultState;
		return defaultState;
	}

	static generateAccessors() {
		const proto = this.prototype;

		// Properties
		const properties = this.getMetadata().getProperties();
		for (const [prop, propData] of Object.entries(properties)) { // eslint-disable-line
			if (!isValidPropertyName(prop)) {
				throw new Error(`"${prop}" is not a valid property name. Use a name that does not collide with DOM APIs`);
			}

			if (propData.type === "boolean" && propData.defaultValue) {
				throw new Error(`Cannot set a default value for property "${prop}". All booleans are false by default.`);
			}

			Object.defineProperty(proto, prop, {
				get() {
					if (this._state[prop] !== undefined) {
						return this._state[prop];
					}

					const propDefaultValue = propData.defaultValue;

					if (propData.type === Boolean) {
						return false;
					} else if (propData.type === String) {  // eslint-disable-line
						return propDefaultValue || "";
					} else if (propData.multiple) { // eslint-disable-line
						return [];
					} else {
						return propDefaultValue;
					}
				},
				set(value) {
					let isDifferent = false;
					value = this.constructor.getMetadata().constructor.validatePropertyValue(value, propData);

					const oldState = this._state[prop];

					if (propData.deepEqual) {
						isDifferent = JSON.stringify(oldState) !== JSON.stringify(value);
					} else {
						isDifferent = oldState !== value;
					}

					if (isDifferent) {
						this._state[prop] = value;
						if (propData.nonVisual) {
							return;
						}
						this._invalidate(prop, value);
						this._propertyChange(prop, value);
					}
				},
			});
		}

		// Slots
		const slots = this.getMetadata().getSlots();
		for (const [slotName, slotData] of Object.entries(slots)) { // eslint-disable-line
			if (!isValidPropertyName(slotName)) {
				throw new Error(`"${slotName}" is not a valid property name. Use a name that does not collide with DOM APIs`);
			}

			const propertyName = slotData.propertyName || slotName;
			Object.defineProperty(proto, propertyName, {
				get() {
					if (this._state[propertyName] !== undefined) {
						return this._state[propertyName];
					}
					return [];
				},
				set() {
					throw new Error("Cannot set slots directly, use the DOM APIs");
				},
			});
		}
	}
}

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
// Helper functions for manipulating parts
// TODO(kschaaf): Refactor into Part API?
const createAndInsertPart = (containerPart, beforePart) => {
    const container = containerPart.startNode.parentNode;
    const beforeNode = beforePart === undefined ? containerPart.endNode :
        beforePart.startNode;
    const startNode = container.insertBefore(createMarker(), beforeNode);
    container.insertBefore(createMarker(), beforeNode);
    const newPart = new NodePart(containerPart.options);
    newPart.insertAfterNode(startNode);
    return newPart;
};
const updatePart = (part, value) => {
    part.setValue(value);
    part.commit();
    return part;
};
const insertPartBefore = (containerPart, part, ref) => {
    const container = containerPart.startNode.parentNode;
    const beforeNode = ref ? ref.startNode : containerPart.endNode;
    const endNode = part.endNode.nextSibling;
    if (endNode !== beforeNode) {
        reparentNodes(container, part.startNode, endNode, beforeNode);
    }
};
const removePart = (part) => {
    removeNodes(part.startNode.parentNode, part.startNode, part.endNode.nextSibling);
};
// Helper for generating a map of array item to its index over a subset
// of an array (used to lazily generate `newKeyToIndexMap` and
// `oldKeyToIndexMap`)
const generateMap = (list, start, end) => {
    const map = new Map();
    for (let i = start; i <= end; i++) {
        map.set(list[i], i);
    }
    return map;
};
// Stores previous ordered list of parts and map of key to index
const partListCache = new WeakMap();
const keyListCache = new WeakMap();
/**
 * A directive that repeats a series of values (usually `TemplateResults`)
 * generated from an iterable, and updates those items efficiently when the
 * iterable changes based on user-provided `keys` associated with each item.
 *
 * Note that if a `keyFn` is provided, strict key-to-DOM mapping is maintained,
 * meaning previous DOM for a given key is moved into the new position if
 * needed, and DOM will never be reused with values for different keys (new DOM
 * will always be created for new keys). This is generally the most efficient
 * way to use `repeat` since it performs minimum unnecessary work for insertions
 * amd removals.
 *
 * IMPORTANT: If providing a `keyFn`, keys *must* be unique for all items in a
 * given call to `repeat`. The behavior when two or more items have the same key
 * is undefined.
 *
 * If no `keyFn` is provided, this directive will perform similar to mapping
 * items to values, and DOM will be reused against potentially different items.
 */
const repeat = directive((items, keyFnOrTemplate, template) => {
    let keyFn;
    if (template === undefined) {
        template = keyFnOrTemplate;
    }
    else if (keyFnOrTemplate !== undefined) {
        keyFn = keyFnOrTemplate;
    }
    return (containerPart) => {
        if (!(containerPart instanceof NodePart)) {
            throw new Error('repeat can only be used in text bindings');
        }
        // Old part & key lists are retrieved from the last update
        // (associated with the part for this instance of the directive)
        const oldParts = partListCache.get(containerPart) || [];
        const oldKeys = keyListCache.get(containerPart) || [];
        // New part list will be built up as we go (either reused from
        // old parts or created for new keys in this update). This is
        // saved in the above cache at the end of the update.
        const newParts = [];
        // New value list is eagerly generated from items along with a
        // parallel array indicating its key.
        const newValues = [];
        const newKeys = [];
        let index = 0;
        for (const item of items) {
            newKeys[index] = keyFn ? keyFn(item, index) : index;
            newValues[index] = template(item, index);
            index++;
        }
        // Maps from key to index for current and previous update; these
        // are generated lazily only when needed as a performance
        // optimization, since they are only required for multiple
        // non-contiguous changes in the list, which are less common.
        let newKeyToIndexMap;
        let oldKeyToIndexMap;
        // Head and tail pointers to old parts and new values
        let oldHead = 0;
        let oldTail = oldParts.length - 1;
        let newHead = 0;
        let newTail = newValues.length - 1;
        // Overview of O(n) reconciliation algorithm (general approach
        // based on ideas found in ivi, vue, snabbdom, etc.):
        //
        // * We start with the list of old parts and new values (and
        //   arrays of their respective keys), head/tail pointers into
        //   each, and we build up the new list of parts by updating
        //   (and when needed, moving) old parts or creating new ones.
        //   The initial scenario might look like this (for brevity of
        //   the diagrams, the numbers in the array reflect keys
        //   associated with the old parts or new values, although keys
        //   and parts/values are actually stored in parallel arrays
        //   indexed using the same head/tail pointers):
        //
        //      oldHead v                 v oldTail
        //   oldKeys:  [0, 1, 2, 3, 4, 5, 6]
        //   newParts: [ ,  ,  ,  ,  ,  ,  ]
        //   newKeys:  [0, 2, 1, 4, 3, 7, 6] <- reflects the user's new
        //                                      item order
        //      newHead ^                 ^ newTail
        //
        // * Iterate old & new lists from both sides, updating,
        //   swapping, or removing parts at the head/tail locations
        //   until neither head nor tail can move.
        //
        // * Example below: keys at head pointers match, so update old
        //   part 0 in-place (no need to move it) and record part 0 in
        //   the `newParts` list. The last thing we do is advance the
        //   `oldHead` and `newHead` pointers (will be reflected in the
        //   next diagram).
        //
        //      oldHead v                 v oldTail
        //   oldKeys:  [0, 1, 2, 3, 4, 5, 6]
        //   newParts: [0,  ,  ,  ,  ,  ,  ] <- heads matched: update 0
        //   newKeys:  [0, 2, 1, 4, 3, 7, 6]    and advance both oldHead
        //                                      & newHead
        //      newHead ^                 ^ newTail
        //
        // * Example below: head pointers don't match, but tail
        //   pointers do, so update part 6 in place (no need to move
        //   it), and record part 6 in the `newParts` list. Last,
        //   advance the `oldTail` and `oldHead` pointers.
        //
        //         oldHead v              v oldTail
        //   oldKeys:  [0, 1, 2, 3, 4, 5, 6]
        //   newParts: [0,  ,  ,  ,  ,  , 6] <- tails matched: update 6
        //   newKeys:  [0, 2, 1, 4, 3, 7, 6]    and advance both oldTail
        //                                      & newTail
        //         newHead ^              ^ newTail
        //
        // * If neither head nor tail match; next check if one of the
        //   old head/tail items was removed. We first need to generate
        //   the reverse map of new keys to index (`newKeyToIndexMap`),
        //   which is done once lazily as a performance optimization,
        //   since we only hit this case if multiple non-contiguous
        //   changes were made. Note that for contiguous removal
        //   anywhere in the list, the head and tails would advance
        //   from either end and pass each other before we get to this
        //   case and removals would be handled in the final while loop
        //   without needing to generate the map.
        //
        // * Example below: The key at `oldTail` was removed (no longer
        //   in the `newKeyToIndexMap`), so remove that part from the
        //   DOM and advance just the `oldTail` pointer.
        //
        //         oldHead v           v oldTail
        //   oldKeys:  [0, 1, 2, 3, 4, 5, 6]
        //   newParts: [0,  ,  ,  ,  ,  , 6] <- 5 not in new map: remove
        //   newKeys:  [0, 2, 1, 4, 3, 7, 6]    5 and advance oldTail
        //         newHead ^           ^ newTail
        //
        // * Once head and tail cannot move, any mismatches are due to
        //   either new or moved items; if a new key is in the previous
        //   "old key to old index" map, move the old part to the new
        //   location, otherwise create and insert a new part. Note
        //   that when moving an old part we null its position in the
        //   oldParts array if it lies between the head and tail so we
        //   know to skip it when the pointers get there.
        //
        // * Example below: neither head nor tail match, and neither
        //   were removed; so find the `newHead` key in the
        //   `oldKeyToIndexMap`, and move that old part's DOM into the
        //   next head position (before `oldParts[oldHead]`). Last,
        //   null the part in the `oldPart` array since it was
        //   somewhere in the remaining oldParts still to be scanned
        //   (between the head and tail pointers) so that we know to
        //   skip that old part on future iterations.
        //
        //         oldHead v        v oldTail
        //   oldKeys:  [0, 1, -, 3, 4, 5, 6]
        //   newParts: [0, 2,  ,  ,  ,  , 6] <- stuck: update & move 2
        //   newKeys:  [0, 2, 1, 4, 3, 7, 6]    into place and advance
        //                                      newHead
        //         newHead ^           ^ newTail
        //
        // * Note that for moves/insertions like the one above, a part
        //   inserted at the head pointer is inserted before the
        //   current `oldParts[oldHead]`, and a part inserted at the
        //   tail pointer is inserted before `newParts[newTail+1]`. The
        //   seeming asymmetry lies in the fact that new parts are
        //   moved into place outside in, so to the right of the head
        //   pointer are old parts, and to the right of the tail
        //   pointer are new parts.
        //
        // * We always restart back from the top of the algorithm,
        //   allowing matching and simple updates in place to
        //   continue...
        //
        // * Example below: the head pointers once again match, so
        //   simply update part 1 and record it in the `newParts`
        //   array.  Last, advance both head pointers.
        //
        //         oldHead v        v oldTail
        //   oldKeys:  [0, 1, -, 3, 4, 5, 6]
        //   newParts: [0, 2, 1,  ,  ,  , 6] <- heads matched: update 1
        //   newKeys:  [0, 2, 1, 4, 3, 7, 6]    and advance both oldHead
        //                                      & newHead
        //            newHead ^        ^ newTail
        //
        // * As mentioned above, items that were moved as a result of
        //   being stuck (the final else clause in the code below) are
        //   marked with null, so we always advance old pointers over
        //   these so we're comparing the next actual old value on
        //   either end.
        //
        // * Example below: `oldHead` is null (already placed in
        //   newParts), so advance `oldHead`.
        //
        //            oldHead v     v oldTail
        //   oldKeys:  [0, 1, -, 3, 4, 5, 6] <- old head already used:
        //   newParts: [0, 2, 1,  ,  ,  , 6]    advance oldHead
        //   newKeys:  [0, 2, 1, 4, 3, 7, 6]
        //               newHead ^     ^ newTail
        //
        // * Note it's not critical to mark old parts as null when they
        //   are moved from head to tail or tail to head, since they
        //   will be outside the pointer range and never visited again.
        //
        // * Example below: Here the old tail key matches the new head
        //   key, so the part at the `oldTail` position and move its
        //   DOM to the new head position (before `oldParts[oldHead]`).
        //   Last, advance `oldTail` and `newHead` pointers.
        //
        //               oldHead v  v oldTail
        //   oldKeys:  [0, 1, -, 3, 4, 5, 6]
        //   newParts: [0, 2, 1, 4,  ,  , 6] <- old tail matches new
        //   newKeys:  [0, 2, 1, 4, 3, 7, 6]   head: update & move 4,
        //                                     advance oldTail & newHead
        //               newHead ^     ^ newTail
        //
        // * Example below: Old and new head keys match, so update the
        //   old head part in place, and advance the `oldHead` and
        //   `newHead` pointers.
        //
        //               oldHead v oldTail
        //   oldKeys:  [0, 1, -, 3, 4, 5, 6]
        //   newParts: [0, 2, 1, 4, 3,   ,6] <- heads match: update 3
        //   newKeys:  [0, 2, 1, 4, 3, 7, 6]    and advance oldHead &
        //                                      newHead
        //                  newHead ^  ^ newTail
        //
        // * Once the new or old pointers move past each other then all
        //   we have left is additions (if old list exhausted) or
        //   removals (if new list exhausted). Those are handled in the
        //   final while loops at the end.
        //
        // * Example below: `oldHead` exceeded `oldTail`, so we're done
        //   with the main loop.  Create the remaining part and insert
        //   it at the new head position, and the update is complete.
        //
        //                   (oldHead > oldTail)
        //   oldKeys:  [0, 1, -, 3, 4, 5, 6]
        //   newParts: [0, 2, 1, 4, 3, 7 ,6] <- create and insert 7
        //   newKeys:  [0, 2, 1, 4, 3, 7, 6]
        //                     newHead ^ newTail
        //
        // * Note that the order of the if/else clauses is not
        //   important to the algorithm, as long as the null checks
        //   come first (to ensure we're always working on valid old
        //   parts) and that the final else clause comes last (since
        //   that's where the expensive moves occur). The order of
        //   remaining clauses is is just a simple guess at which cases
        //   will be most common.
        //
        // * TODO(kschaaf) Note, we could calculate the longest
        //   increasing subsequence (LIS) of old items in new position,
        //   and only move those not in the LIS set. However that costs
        //   O(nlogn) time and adds a bit more code, and only helps
        //   make rare types of mutations require fewer moves. The
        //   above handles removes, adds, reversal, swaps, and single
        //   moves of contiguous items in linear time, in the minimum
        //   number of moves. As the number of multiple moves where LIS
        //   might help approaches a random shuffle, the LIS
        //   optimization becomes less helpful, so it seems not worth
        //   the code at this point. Could reconsider if a compelling
        //   case arises.
        while (oldHead <= oldTail && newHead <= newTail) {
            if (oldParts[oldHead] === null) {
                // `null` means old part at head has already been used
                // below; skip
                oldHead++;
            }
            else if (oldParts[oldTail] === null) {
                // `null` means old part at tail has already been used
                // below; skip
                oldTail--;
            }
            else if (oldKeys[oldHead] === newKeys[newHead]) {
                // Old head matches new head; update in place
                newParts[newHead] =
                    updatePart(oldParts[oldHead], newValues[newHead]);
                oldHead++;
                newHead++;
            }
            else if (oldKeys[oldTail] === newKeys[newTail]) {
                // Old tail matches new tail; update in place
                newParts[newTail] =
                    updatePart(oldParts[oldTail], newValues[newTail]);
                oldTail--;
                newTail--;
            }
            else if (oldKeys[oldHead] === newKeys[newTail]) {
                // Old head matches new tail; update and move to new tail
                newParts[newTail] =
                    updatePart(oldParts[oldHead], newValues[newTail]);
                insertPartBefore(containerPart, oldParts[oldHead], newParts[newTail + 1]);
                oldHead++;
                newTail--;
            }
            else if (oldKeys[oldTail] === newKeys[newHead]) {
                // Old tail matches new head; update and move to new head
                newParts[newHead] =
                    updatePart(oldParts[oldTail], newValues[newHead]);
                insertPartBefore(containerPart, oldParts[oldTail], oldParts[oldHead]);
                oldTail--;
                newHead++;
            }
            else {
                if (newKeyToIndexMap === undefined) {
                    // Lazily generate key-to-index maps, used for removals &
                    // moves below
                    newKeyToIndexMap = generateMap(newKeys, newHead, newTail);
                    oldKeyToIndexMap = generateMap(oldKeys, oldHead, oldTail);
                }
                if (!newKeyToIndexMap.has(oldKeys[oldHead])) {
                    // Old head is no longer in new list; remove
                    removePart(oldParts[oldHead]);
                    oldHead++;
                }
                else if (!newKeyToIndexMap.has(oldKeys[oldTail])) {
                    // Old tail is no longer in new list; remove
                    removePart(oldParts[oldTail]);
                    oldTail--;
                }
                else {
                    // Any mismatches at this point are due to additions or
                    // moves; see if we have an old part we can reuse and move
                    // into place
                    const oldIndex = oldKeyToIndexMap.get(newKeys[newHead]);
                    const oldPart = oldIndex !== undefined ? oldParts[oldIndex] : null;
                    if (oldPart === null) {
                        // No old part for this value; create a new one and
                        // insert it
                        const newPart = createAndInsertPart(containerPart, oldParts[oldHead]);
                        updatePart(newPart, newValues[newHead]);
                        newParts[newHead] = newPart;
                    }
                    else {
                        // Reuse old part
                        newParts[newHead] =
                            updatePart(oldPart, newValues[newHead]);
                        insertPartBefore(containerPart, oldPart, oldParts[oldHead]);
                        // This marks the old part as having been used, so that
                        // it will be skipped in the first two checks above
                        oldParts[oldIndex] = null;
                    }
                    newHead++;
                }
            }
        }
        // Add parts for any remaining new values
        while (newHead <= newTail) {
            // For all remaining additions, we insert before last new
            // tail, since old pointers are no longer valid
            const newPart = createAndInsertPart(containerPart, newParts[newTail + 1]);
            updatePart(newPart, newValues[newHead]);
            newParts[newHead++] = newPart;
        }
        // Remove any remaining unused old parts
        while (oldHead <= oldTail) {
            const oldPart = oldParts[oldHead++];
            if (oldPart !== null) {
                removePart(oldPart);
            }
        }
        // Save order of new parts for next round
        partListCache.set(containerPart, newParts);
        keyListCache.set(containerPart, newKeys);
    };
});

/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * Stores the ClassInfo object applied to a given AttributePart.
 * Used to unset existing values when a new ClassInfo object is applied.
 */
const classMapCache = new WeakMap();
/**
 * A directive that applies CSS classes. This must be used in the `class`
 * attribute and must be the only part used in the attribute. It takes each
 * property in the `classInfo` argument and adds the property name to the
 * element's `classList` if the property value is truthy; if the property value
 * is falsey, the property name is removed from the element's `classList`. For
 * example
 * `{foo: bar}` applies the class `foo` if the value of `bar` is truthy.
 * @param classInfo {ClassInfo}
 */
const classMap = directive((classInfo) => (part) => {
    if (!(part instanceof AttributePart) || (part instanceof PropertyPart) ||
        part.committer.name !== 'class' || part.committer.parts.length > 1) {
        throw new Error('The `classMap` directive must be used in the `class` attribute ' +
            'and must be the only part in the attribute.');
    }
    const { committer } = part;
    const { element } = committer;
    // handle static classes
    if (!classMapCache.has(part)) {
        element.className = committer.strings.join(' ');
    }
    const { classList } = element;
    // remove old classes that no longer apply
    const oldInfo = classMapCache.get(part);
    for (const name in oldInfo) {
        if (!(name in classInfo)) {
            classList.remove(name);
        }
    }
    // add new classes
    for (const name in classInfo) {
        const value = classInfo[name];
        if (!oldInfo || value !== oldInfo[name]) {
            // We explicitly want a loose truthy check here because
            // it seems more convenient that '' and 0 are skipped.
            const method = value ? 'add' : 'remove';
            classList[method](name);
        }
    }
    classMapCache.set(part, classInfo);
});

/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * Stores the StyleInfo object applied to a given AttributePart.
 * Used to unset existing values when a new StyleInfo object is applied.
 */
const styleMapCache = new WeakMap();
/**
 * A directive that applies CSS properties to an element.
 *
 * `styleMap` can only be used in the `style` attribute and must be the only
 * expression in the attribute. It takes the property names in the `styleInfo`
 * object and adds the property values as CSS propertes. Property names with
 * dashes (`-`) are assumed to be valid CSS property names and set on the
 * element's style object using `setProperty()`. Names without dashes are
 * assumed to be camelCased JavaScript property names and set on the element's
 * style object using property assignment, allowing the style object to
 * translate JavaScript-style names to CSS property names.
 *
 * For example `styleMap({backgroundColor: 'red', 'border-top': '5px', '--size':
 * '0'})` sets the `background-color`, `border-top` and `--size` properties.
 *
 * @param styleInfo {StyleInfo}
 */
const styleMap$1 = directive((styleInfo) => (part) => {
    if (!(part instanceof AttributePart) || (part instanceof PropertyPart) ||
        part.committer.name !== 'style' || part.committer.parts.length > 1) {
        throw new Error('The `styleMap` directive must be used in the style attribute ' +
            'and must be the only part in the attribute.');
    }
    const { committer } = part;
    const { style } = committer.element;
    // Handle static styles the first time we see a Part
    if (!styleMapCache.has(part)) {
        style.cssText = committer.strings.join(' ');
    }
    // Remove old properties that no longer exist in styleInfo
    const oldInfo = styleMapCache.get(part);
    for (const name in oldInfo) {
        if (!(name in styleInfo)) {
            if (name.indexOf('-') === -1) {
                // tslint:disable-next-line:no-any
                style[name] = null;
            }
            else {
                style.removeProperty(name);
            }
        }
    }
    // Add or update properties
    for (const name in styleInfo) {
        if (name.indexOf('-') === -1) {
            // tslint:disable-next-line:no-any
            style[name] = styleInfo[name];
        }
        else {
            style.setProperty(name, styleInfo[name]);
        }
    }
    styleMapCache.set(part, styleInfo);
});

const litRender = (templateResult, domNode, styles, { eventContext } = {}) => {
	if (styles) {
		templateResult = html`<style>${styles}</style>${templateResult}`;
	}
	render(templateResult, domNode, { eventContext });
};

class NativeResize {
	static initialize() {
		NativeResize.resizeObserver = new window.ResizeObserver(entries => {
			// call attached callbacks
			entries.forEach(entry => {
				const callbacks = NativeResize.observedObjects.get(entry.target);

				callbacks.forEach(el => el());
			});
		});

		NativeResize.observedObjects = new Map();
	}

	static attachListener(ref, callback) {
		const observedDOMs = NativeResize.observedObjects;
		const callbacks = observedDOMs.get(ref) || [];

		// if no callbacks has been added for this ref - start observing it
		if (!callbacks.length) {
			NativeResize.resizeObserver.observe(ref);
		}

		// save the callbacks in an array
		observedDOMs.set(ref, [...callbacks, callback]);
	}

	static detachListener(ref, callback) {
		const callbacks = NativeResize.observedObjects.get(ref) || [];
		const filteredCallbacks = callbacks.filter(fn => fn !== callback);

		// TODO: think for a validation mechanism
		if (!callbacks.length || (callbacks.length === filteredCallbacks.length && callbacks.length !== 0)) {
			return;
		}

		NativeResize.observedObjects.set(ref, filteredCallbacks);

		if (!filteredCallbacks.length) {
			NativeResize.resizeObserver.unobserve(ref);
		}
	}
}

const INTERVAL = 300;

class CustomResize {
	static initialize() {
		CustomResize.initialized = false;
		CustomResize.resizeInterval = undefined;
		CustomResize.resizeListeners = new Map();
	}

	static attachListener(ref, callback) {
		const observedObject = CustomResize.resizeListeners.get(ref);
		const existingCallbacks = observedObject ? observedObject.callbacks : [];

		CustomResize.resizeListeners.set(ref, {
			width: ref ? ref.offsetWidth : 0,
			height: ref ? ref.offsetHeight : 0,
			callbacks: existingCallbacks.concat(callback),
		});

		CustomResize.initListener();
	}

	static initListener() {
		if (CustomResize.resizeListeners.size > 0 && !CustomResize.initialized) {
			CustomResize.resizeInterval = setInterval(CustomResize.checkListeners.bind(CustomResize), INTERVAL);
		}
	}

	static checkListeners() {
		CustomResize.resizeListeners.forEach((entry, ref) => {
			const changed = CustomResize.checkSizes(entry, ref);

			if (changed) {
				CustomResize.updateSizes(entry, ref.offsetWidth, ref.offsetHeight);
				entry.callbacks.forEach(el => el());
			}
		});
	}

	static updateSizes(sizes, newWidth, newHeight) {
		sizes.width = newWidth;
		sizes.height = newHeight;
	}

	static checkSizes(entry, ref) {
		const oldHeight = entry.height;
		const oldWidth = entry.width;
		const newHeight = ref.offsetHeight;
		const newWidth = ref.offsetWidth;

		return ((oldHeight !== newHeight) || oldWidth !== newWidth);
	}

	static detachListener(ref, callback) {
		const listenerObject = CustomResize.resizeListeners.get(ref);
		const callbacks = listenerObject ? listenerObject.callbacks : [];
		const filteredCallbacks = callbacks.filter(fn => fn !== callback);

		if (!listenerObject || (callbacks.length === filteredCallbacks.length && callbacks.length !== 0)) {
			return;
		}

		CustomResize.resizeListeners.set(ref, Object.assign(listenerObject, { callbacks: filteredCallbacks }));

		if (!filteredCallbacks.length) {
			listenerObject.callbacks = null;
			CustomResize.resizeListeners.delete(ref);
		}

		if (CustomResize.resizeListeners.size === 0) {
			CustomResize.initialized = false;
			clearInterval(CustomResize.resizeInterval);
		}
	}
}

class ResizeHandler {
	static initialize() {
		ResizeHandler.Implementation = window.ResizeObserver ? NativeResize : CustomResize;
		ResizeHandler.Implementation.initialize();
	}

	/**
	 * @static
	 * @private
	 * @param {*} ref Reference to be observed
	 * @param {*} callback Callback to be executed
	 * @memberof ResizeHandler
	 */
	static attachListener(ref, callback) {
		ResizeHandler.Implementation.attachListener.call(ResizeHandler.Implementation, ref, callback);
	}

	/**
	 * @static
	 * @private
	 * @param {*} ref Reference to be unobserved
	 * @memberof ResizeHandler
	 */
	static detachListener(ref, callback) {
		ResizeHandler.Implementation.detachListener.call(ResizeHandler.Implementation, ref, callback);
	}


	/**
	 * @static
	 * @public
	 * @param {*} ref Reference to a UI5 Web Component or DOM Element to be observed
	 * @param {*} callback Callback to be executed
	 * @memberof ResizeHandler
	 */
	static register(ref, callback) {
		if (ref instanceof UI5Element) {
			ref = ref.getDomRef();
		}

		ResizeHandler.attachListener(ref, callback);
	}


	/**
	 * @static
	 * @public
	 * @param {*} ref Reference to UI5 Web Component or DOM Element to be unobserved
	 * @memberof ResizeHandler
	 */
	static deregister(ref, callback) {
		if (ref instanceof UI5Element) {
			ref = ref.getDomRef();
		}

		ResizeHandler.detachListener(ref, callback);
	}
}

ResizeHandler.initialize();

var mKeyCodes = {
  BACKSPACE: 8,
  TAB: 9,
  ENTER: 13,
  SHIFT: 16,
  CONTROL: 17,
  ALT: 18,
  BREAK: 19,
  CAPS_LOCK: 20,
  ESCAPE: 27,
  SPACE: 32,
  PAGE_UP: 33,
  PAGE_DOWN: 34,
  END: 35,
  HOME: 36,
  ARROW_LEFT: 37,
  ARROW_UP: 38,
  ARROW_RIGHT: 39,
  ARROW_DOWN: 40,
  PRINT: 44,
  INSERT: 45,
  DELETE: 46,
  DIGIT_0: 48,
  DIGIT_1: 49,
  DIGIT_2: 50,
  DIGIT_3: 51,
  DIGIT_4: 52,
  DIGIT_5: 53,
  DIGIT_6: 54,
  DIGIT_7: 55,
  DIGIT_8: 56,
  DIGIT_9: 57,
  A: 65,
  B: 66,
  C: 67,
  D: 68,
  E: 69,
  F: 70,
  G: 71,
  H: 72,
  I: 73,
  J: 74,
  K: 75,
  L: 76,
  M: 77,
  N: 78,
  O: 79,
  P: 80,
  Q: 81,
  R: 82,
  S: 83,
  T: 84,
  U: 85,
  V: 86,
  W: 87,
  X: 88,
  Y: 89,
  Z: 90,
  WINDOWS: 91,
  CONTEXT_MENU: 93,
  TURN_OFF: 94,
  SLEEP: 95,
  NUMPAD_0: 96,
  NUMPAD_1: 97,
  NUMPAD_2: 98,
  NUMPAD_3: 99,
  NUMPAD_4: 100,
  NUMPAD_5: 101,
  NUMPAD_6: 102,
  NUMPAD_7: 103,
  NUMPAD_8: 104,
  NUMPAD_9: 105,
  NUMPAD_ASTERISK: 106,
  NUMPAD_PLUS: 107,
  NUMPAD_MINUS: 109,
  NUMPAD_COMMA: 110,
  NUMPAD_SLASH: 111,
  F1: 112,
  F2: 113,
  F3: 114,
  F4: 115,
  F5: 116,
  F6: 117,
  F7: 118,
  F8: 119,
  F9: 120,
  F10: 121,
  F11: 122,
  F12: 123,
  NUM_LOCK: 144,
  SCROLL_LOCK: 145,
  OPEN_BRACKET: 186,
  PLUS: 187,
  COMMA: 188,
  SLASH: 189,
  DOT: 190,
  PIPE: 191,
  SEMICOLON: 192,
  MINUS: 219,
  GREAT_ACCENT: 220,
  EQUALS: 221,
  SINGLE_QUOTE: 222,
  BACKSLASH: 226
};

const isEnter = event => (event.key ? event.key === "Enter" : event.keyCode === mKeyCodes.ENTER) && !hasModifierKeys(event);

const isSpace = event => (event.key ? (event.key === "Spacebar" || event.key === " ") : event.keyCode === mKeyCodes.SPACE) && !hasModifierKeys(event);

const isLeft = event => (event.key ? (event.key === "ArrowLeft" || event.key === "Left") : event.keyCode === mKeyCodes.ARROW_LEFT) && !hasModifierKeys(event);

const isRight = event => (event.key ? (event.key === "ArrowRight" || event.key === "Right") : event.keyCode === mKeyCodes.ARROW_RIGHT) && !hasModifierKeys(event);

const isUp = event => (event.key ? (event.key === "ArrowUp" || event.key === "Up") : event.keyCode === mKeyCodes.ARROW_UP) && !hasModifierKeys(event);

const isDown = event => (event.key ? (event.key === "ArrowDown" || event.key === "Down") : event.keyCode === mKeyCodes.ARROW_DOWN) && !hasModifierKeys(event);

const isHome = event => (event.key ? event.key === "Home" : event.keyCode === mKeyCodes.HOME) && !hasModifierKeys(event);

const isEnd = event => (event.key ? event.key === "End" : event.keyCode === mKeyCodes.END) && !hasModifierKeys(event);

const isEscape = event => (event.key ? event.key === "Escape" || event.key === "Esc" : event.keyCode === mKeyCodes.ESCAPE) && !hasModifierKeys(event);

const isTabNext = event => (event.key ? event.key === "Tab" : event.keyCode === mKeyCodes.TAB) && !hasModifierKeys(event);

const isTabPrevious = event => (event.key ? event.key === "Tab" : event.keyCode === mKeyCodes.TAB) && checkModifierKeys(event, /* Ctrl */ false, /* Alt */ false, /* Shift */ true);

const hasModifierKeys = event => event.shiftKey || event.altKey || getCtrlKey(event);

const getCtrlKey = event => !!(event.metaKey || event.ctrlKey); // double negation doesn't have effect on boolean but ensures null and undefined are equivalent to false.

const checkModifierKeys = (oEvent, bCtrlKey, bAltKey, bShiftKey) => oEvent.shiftKey === bShiftKey && oEvent.altKey === bAltKey && getCtrlKey(oEvent) === bCtrlKey;

class EventProvider {
	constructor() {
		this._eventRegistry = {};
	}

	attachEvent(eventName, fnFunction) {
		const eventRegistry = this._eventRegistry;
		let eventListeners = eventRegistry[eventName];

		if (!Array.isArray(eventListeners)) {
			eventRegistry[eventName] = [];
			eventListeners = eventRegistry[eventName];
		}

		eventListeners.push({
			"function": fnFunction,
		});
	}

	detachEvent(eventName, fnFunction) {
		const eventRegistry = this._eventRegistry;
		const eventListeners = eventRegistry[eventName];

		if (!eventListeners) {
			return;
		}

		for (let i = 0; i < eventListeners.length; i++) {
			const event = eventListeners[i];
			if (event["function"] === fnFunction) { // eslint-disable-line
				eventListeners.splice(i, 1);
			}
		}

		if (eventListeners.length === 0) {
			delete eventRegistry[eventName];
		}
	}

	fireEvent(eventName, data) {
		const eventRegistry = this._eventRegistry;
		const eventListeners = eventRegistry[eventName];

		if (!eventListeners) {
			return;
		}

		eventListeners.forEach(event => {
			event["function"].call(this, data); // eslint-disable-line
		});
	}

	isHandlerAttached(eventName, fnFunction) {
		const eventRegistry = this._eventRegistry;
		const eventListeners = eventRegistry[eventName];

		if (!eventListeners) {
			return false;
		}

		for (let i = 0; i < eventListeners.length; i++) {
			const event = eventListeners[i];
			if (event["function"] === fnFunction) { // eslint-disable-line
				return true;
			}
		}

		return false;
	}

	hasListeners(eventName) {
		return !!this._eventRegistry[eventName];
	}
}

// navigatable items must have id and tabindex
class ItemNavigation extends EventProvider {
	constructor(rootWebComponent, options = {}) {
		super();

		this.currentIndex = options.currentIndex || 0;
		this.rowSize = options.rowSize || 1;
		this.cyclic = options.cyclic || false;

		this.rootWebComponent = rootWebComponent;
	}

	init() {
		this._getItems().forEach((item, idx) => {
			item._tabIndex = (idx === this.currentIndex) ? "0" : "-1";
		});
	}

	_onKeyPress(event) {
		const items = this._getItems();

		if (this.currentIndex >= items.length) {
			if (!this.cyclic) {
				this.fireEvent(ItemNavigation.BORDER_REACH, { start: false, end: true, offset: this.currentIndex });
			}

			this.currentIndex = this.currentIndex - items.length;
		} else if (this.currentIndex < 0) {
			if (!this.cyclic) {
				this.fireEvent(ItemNavigation.BORDER_REACH, { start: true, end: false, offset: this.currentIndex });
			}

			this.currentIndex = items.length + this.currentIndex;
		}

		this.update();
		this.focusCurrent();

		// stops browser scrolling with up/down keys
		event.stopPropagation();
		event.stopImmediatePropagation();
		event.preventDefault();
	}

	onkeydown(event) {
		if (isUp(event)) {
			return this._handleUp(event);
		}

		if (isDown(event)) {
			return this._handleDown(event);
		}

		if (isLeft(event)) {
			return this._handleLeft(event);
		}

		if (isRight(event)) {
			return this._handleRight(event);
		}

		if (isHome(event)) {
			return this._handleHome(event);
		}

		if (isEnd(event)) {
			return this._handleEnd(event);
		}
	}

	_handleUp(event) {
		if (this._canNavigate()) {
			this.currentIndex -= this.rowSize;
			this._onKeyPress(event);
		}
	}

	_handleDown(event) {
		if (this._canNavigate()) {
			this.currentIndex += this.rowSize;
			this._onKeyPress(event);
		}
	}

	_handleLeft(event) {
		if (this._canNavigate()) {
			this.currentIndex -= 1;
			this._onKeyPress(event);
		}
	}

	_handleRight(event) {
		if (this._canNavigate()) {
			this.currentIndex += 1;
			this._onKeyPress(event);
		}
	}

	_handleHome(event) {
		if (this._canNavigate()) {
			const homeEndRange = this.rowSize > 1 ? this.rowSize : this._getItems().length;
			this.currentIndex -= this.currentIndex % homeEndRange;
			this._onKeyPress(event);
		}
	}

	_handleEnd(event) {
		if (this._canNavigate()) {
			const homeEndRange = this.rowSize > 1 ? this.rowSize : this._getItems().length;
			this.currentIndex += (homeEndRange - 1 - this.currentIndex % homeEndRange); // eslint-disable-line
			this._onKeyPress(event);
		}
	}

	update(current) {
		const origItems = this._getItems();

		if (current) {
			this.currentIndex = this._getItems().indexOf(current);
		}

		if (!origItems[this.currentIndex]
			|| (origItems[this.currentIndex]._tabIndex && origItems[this.currentIndex]._tabIndex === "0")) {
			return;
		}

		const items = origItems.slice(0);

		for (let i = 0; i < items.length; i++) {
			items[i]._tabIndex = (i === this.currentIndex ? "0" : "-1");
		}

		if (this._setItems) {
			this._setItems(items);
		}
	}

	focusCurrent() {
		const currentItem = this._getCurrentItem();
		if (currentItem) {
			currentItem.focus();
		}
	}

	_canNavigate() {
		const currentItem = this._getCurrentItem();

		let activeElement = document.activeElement;

		while (activeElement.shadowRoot && activeElement.shadowRoot.activeElement) {
			activeElement = activeElement.shadowRoot.activeElement;
		}

		return currentItem && currentItem === activeElement;
	}

	_getCurrentItem() {
		const items = this._getItems();

		if (!items.length) {
			return null;
		}

		// normalize the index
		while (this.currentIndex >= items.length) {
			this.currentIndex -= this.rowSize;
		}

		if (this.currentIndex < 0) {
			this.currentIndex = 0;
		}

		const currentItem = items[this.currentIndex];

		if (currentItem instanceof UI5Element) {
			return currentItem.getFocusDomRef();
		}

		if (!this.rootWebComponent.getDomRef()) {
			return;
		}

		return this.rootWebComponent.getDomRef().querySelector(`#${currentItem.id}`);
	}

	set setItemsCallback(fn) {
		this._setItems = fn;
	}

	set getItemsCallback(fn) {
		this._getItems = fn;
	}

	set current(val) {
		this.currentIndex = val;
	}
}

ItemNavigation.BORDER_REACH = "_borderReach";

var detectNavigatorLanguage = () => {
	const browserLanguages = navigator.languages;

	const navigatorLanguage = () => {
		return navigator.language;
	};

	const rawLocale = (browserLanguages && browserLanguages[0]) || navigatorLanguage() || navigator.userLanguage || navigator.browserLanguage;

	return rawLocale || "en";
};

const M_ISO639_OLD_TO_NEW = {
	"iw": "he",
	"ji": "yi",
	"in": "id",
	"sh": "sr",
};

const A_RTL_LOCALES = getDesigntimePropertyAsArray("$cldr-rtl-locales:ar,fa,he$") || [];

const impliesRTL = language => {
	language = (language && M_ISO639_OLD_TO_NEW[language]) || language;

	return A_RTL_LOCALES.indexOf(language) >= 0;
};

const getEffectiveRTL = () => {
	const configurationRTL = getRTL();

	if (configurationRTL !== null) {
		return !!configurationRTL;
	}

	return impliesRTL(getLanguage() || detectNavigatorLanguage());
};

/**
 * Different states.
 */
const ValueStates = {
	None: "None",
	Success: "Success",
	Warning: "Warning",
	Error: "Error",
};

class ValueState extends DataType {
	static isValid(value) {
		return !!ValueStates[value];
	}
}

ValueState.generataTypeAcessors(ValueStates);

const Device = {};
const OS = {
  "WINDOWS": "win",
  "MACINTOSH": "mac",
  "IOS": "iOS",
  "ANDROID": "Android"
};
const _getMobileOS = () => {
  const userAgent = navigator.userAgent;
  let rPlatform, aMatches;
  rPlatform = /\(([a-zA-Z ]+);\s(?:[U]?[;]?)([\D]+)((?:[\d._]*))(?:.*[\)][^\d]*)([\d.]*)\s/;
  aMatches = userAgent.match(rPlatform);
  if (aMatches) {
    var rAppleDevices = /iPhone|iPad|iPod/;
    if (aMatches[0].match(rAppleDevices)) {
      aMatches[3] = aMatches[3].replace(/_/g, ".");
      return {
        "name": OS.IOS,
        "versionStr": aMatches[3]
      };
    }
    if (aMatches[2].match(/Android/)) {
      aMatches[2] = aMatches[2].replace(/\s/g, "");
      return {
        "name": OS.ANDROID,
        "versionStr": aMatches[3]
      };
    }
  }
  rPlatform = /\((Android)[\s]?([\d][.\d]*)?;.*Firefox\/[\d][.\d]*/;
  aMatches = userAgent.match(rPlatform);
  if (aMatches) {
    return {
      "name": OS.ANDROID,
      "versionStr": aMatches.length === 3 ? aMatches[2] : ""
    };
  }
};
const _getDesktopOS = () => {
  const sPlatform = navigator.platform;
  if (sPlatform.indexOf("Win") !== -1) {
    const rVersion = /Windows NT (\d+).(\d)/i;
    const uaResult = navigator.userAgent.match(rVersion);
    return {
      "name": OS.WINDOWS,
      "versionStr": uaResult[1]
    };
  }
  if (sPlatform.indexOf("Mac") !== -1) {
    return {
      "name": OS.MACINTOSH,
      "versionStr": ""
    };
  }
  return null;
};
const _getOS = () => {
  return _getMobileOS() || _getDesktopOS();
};
const _setOS = () => {
  if (Device.os) {
    return;
  }
  Device.os = _getOS() || ({});
  Device.os.OS = OS;
  Device.os.version = Device.os.versionStr ? parseFloat(Device.os.versionStr) : -1;
  if (Device.os.name) {
    for (let name in OS) {
      if (OS[name] === Device.os.name) {
        Device.os[name.toLowerCase()] = true;
      }
    }
  }
};
const BROWSER = {
  "INTERNET_EXPLORER": "ie",
  "EDGE": "ed",
  "FIREFOX": "ff",
  "CHROME": "cr",
  "SAFARI": "sf",
  "ANDROID": "an"
};
const _calcBrowser = () => {
  const sUserAgent = navigator.userAgent.toLowerCase();
  const rwebkit = /(webkit)[ \/]([\w.]+)/;
  const rmsie = /(msie) ([\w.]+)/;
  const rmsie11 = /(trident)\/[\w.]+;.*rv:([\w.]+)/;
  const redge = /(edge)[ \/]([\w.]+)/;
  const rmozilla = /(mozilla)(?:.*? rv:([\w.]+))?/;
  const browserMatch = redge.exec(sUserAgent) || rmsie11.exec(sUserAgent) || rwebkit.exec(sUserAgent) || rmsie.exec(sUserAgent) || sUserAgent.indexOf("compatible") < 0 && rmozilla.exec(sUserAgent) || [];
  const oRes = {
    browser: browserMatch[1] || "",
    version: browserMatch[2] || "0"
  };
  oRes[oRes.browser] = true;
  return oRes;
};
const _getBrowser = () => {
  const oBrowser = _calcBrowser();
  const sUserAgent = navigator.userAgent;
  const oNavigator = window.navigator;
  let oExpMobile;
  let oResult;
  if (oBrowser.mozilla) {
    oExpMobile = /Mobile/;
    if (sUserAgent.match(/Firefox\/(\d+\.\d+)/)) {
      var fVersion = parseFloat(RegExp.$1);
      oResult = {
        name: BROWSER.FIREFOX,
        versionStr: "" + fVersion,
        version: fVersion,
        mozilla: true,
        mobile: oExpMobile.test(sUserAgent)
      };
    } else {
      oResult = {
        mobile: oExpMobile.test(sUserAgent),
        mozilla: true,
        version: -1
      };
    }
  } else if (oBrowser.webkit) {
    var regExpWebkitVersion = sUserAgent.toLowerCase().match(/webkit[\/]([\d.]+)/);
    var webkitVersion;
    if (regExpWebkitVersion) {
      webkitVersion = regExpWebkitVersion[1];
    }
    oExpMobile = /Mobile/;
    var aChromeMatch = sUserAgent.match(/(Chrome|CriOS)\/(\d+\.\d+).\d+/);
    var aFirefoxMatch = sUserAgent.match(/FxiOS\/(\d+\.\d+)/);
    var aAndroidMatch = sUserAgent.match(/Android .+ Version\/(\d+\.\d+)/);
    if (aChromeMatch || aFirefoxMatch || aAndroidMatch) {
      var sName, sVersion, bMobile;
      if (aChromeMatch) {
        sName = BROWSER.CHROME;
        bMobile = oExpMobile.test(sUserAgent);
        sVersion = parseFloat(aChromeMatch[2]);
      } else if (aFirefoxMatch) {
        sName = BROWSER.FIREFOX;
        bMobile = true;
        sVersion = parseFloat(aFirefoxMatch[1]);
      } else if (aAndroidMatch) {
        sName = BROWSER.ANDROID;
        bMobile = oExpMobile.test(sUserAgent);
        sVersion = parseFloat(aAndroidMatch[1]);
      }
      oResult = {
        name: sName,
        mobile: bMobile,
        versionStr: "" + sVersion,
        version: sVersion,
        webkit: true,
        webkitVersion: webkitVersion
      };
    } else {
      var oExp = /(Version|PhantomJS)\/(\d+\.\d+).*Safari/;
      var bStandalone = oNavigator.standalone;
      if (oExp.test(sUserAgent)) {
        var aParts = oExp.exec(sUserAgent);
        var fVersion = parseFloat(aParts[2]);
        oResult = {
          name: BROWSER.SAFARI,
          versionStr: "" + fVersion,
          fullscreen: false,
          webview: false,
          version: fVersion,
          mobile: oExpMobile.test(sUserAgent),
          webkit: true,
          webkitVersion: webkitVersion,
          phantomJS: aParts[1] === "PhantomJS"
        };
      } else if ((/iPhone|iPad|iPod/).test(sUserAgent) && !(/CriOS/).test(sUserAgent) && !(/FxiOS/).test(sUserAgent) && (bStandalone === true || bStandalone === false)) {
        oResult = {
          name: BROWSER.SAFARI,
          version: -1,
          fullscreen: bStandalone,
          webview: !bStandalone,
          mobile: oExpMobile.test(sUserAgent),
          webkit: true,
          webkitVersion: webkitVersion
        };
      } else {
        oResult = {
          mobile: oExpMobile.test(sUserAgent),
          webkit: true,
          webkitVersion: webkitVersion,
          version: -1
        };
      }
    }
  } else if (oBrowser.msie || oBrowser.trident) {
    var fVersion = parseFloat(oBrowser.version);
    oResult = {
      name: BROWSER.INTERNET_EXPLORER,
      versionStr: "" + fVersion,
      version: fVersion,
      msie: true,
      mobile: false
    };
  } else if (oBrowser.edge) {
    var fVersion = fVersion = parseFloat(oBrowser.version);
    oResult = {
      name: BROWSER.EDGE,
      versionStr: "" + fVersion,
      version: fVersion,
      edge: true
    };
  } else {
    oResult = {
      name: "",
      versionStr: "",
      version: -1,
      mobile: false
    };
  }
  return oResult;
};
const _setBrowser = () => {
  Device.browser = _getBrowser();
  Device.browser.BROWSER = BROWSER;
  if (Device.browser.name) {
    for (var b in BROWSER) {
      if (BROWSER[b] === Device.browser.name) {
        Device.browser[b.toLowerCase()] = true;
      }
    }
  }
};
const _setSupport = () => {
  if (Device.support) {
    return;
  }
  if (!Device.browser) {
    _setBrowser();
  }
  Device.support = {};
  Device.support.touch = !!(("ontouchstart" in window) || navigator.maxTouchPoints > 0 || window.DocumentTouch && document instanceof window.DocumentTouch);
};
const supportTouch = () => {
  if (!Device.support) {
    _setSupport();
  }
  return !!Device.support.touch;
};
const SYSTEMTYPE = {
  "TABLET": "tablet",
  "PHONE": "phone",
  "DESKTOP": "desktop",
  "COMBI": "combi"
};
const _isTablet = () => {
  const sUserAgent = navigator.userAgent;
  if (Device.os.name === Device.os.OS.IOS) {
    return (/ipad/i).test(sUserAgent);
  } else {
    if (supportTouch()) {
      if (Device.os.windows && Device.os.version >= 8) {
        return true;
      }
      if (Device.browser.chrome && Device.os.android && Device.os.version >= 4.4) {
        return !(/Mobile Safari\/[.0-9]+/).test(sUserAgent);
      } else {
        let densityFactor = window.devicePixelRatio ? window.devicePixelRatio : 1;
        if (Device.os.android && Device.browser.webkit && parseFloat(Device.browser.webkitVersion) > 537.1) {
          densityFactor = 1;
        }
        const bTablet = Math.min(window.screen.width / densityFactor, window.screen.height / densityFactor) >= 600;
        return bTablet;
      }
    } else {
      const bAndroidPhone = (/(?=android)(?=.*mobile)/i).test(sUserAgent);
      return Device.browser.msie && sUserAgent.indexOf("Touch") !== -1 || Device.os.android && !bAndroidPhone;
    }
  }
};
const _getSystem = () => {
  const bTabletDetected = _isTablet();
  const isWin8Upwards = Device.os.windows && Device.os.version >= 8;
  const oSystem = {};
  oSystem.tablet = !!((Device.support.touch || isWin8Upwards) && bTabletDetected);
  oSystem.phone = !!(Device.os.windows_phone || Device.support.touch && !bTabletDetected);
  oSystem.desktop = !!(!oSystem.tablet && !oSystem.phone || isWin8Upwards);
  oSystem.combi = oSystem.desktop && oSystem.tablet;
  oSystem.SYSTEMTYPE = SYSTEMTYPE;
  return oSystem;
};
const _setSystem = () => {
  _setSupport();
  _setOS();
  Device.system = {};
  Device.system = _getSystem();
  if (Device.system.tablet || Device.system.phone) {
    Device.browser.mobile = true;
  }
};
const isDesktop = () => {
  if (!Device.system) {
    _setSystem();
  }
  return Device.system.desktop;
};
const isPhone = () => {
  if (!Device.system) {
    _setSystem();
  }
  return Device.system.phone;
};

/**
 * Different types of ListItem.
 */
const ListItemTypes = {
	/**
	 * Indicates the list item does not have any active feedback when item is pressed.
	 * @public
	 */
	Inactive: "Inactive",

	/**
	 * Indicates that the item is clickable via active feedback when item is pressed.
	 * @public
	 */
	Active: "Active",
};

class ListItemType extends DataType {
	static isValid(value) {
		return !!ListItemTypes[value];
	}
}

ListItemType.generataTypeAcessors(ListItemTypes);

const ListModes = {
	/**
	 * Default mode (no selection).
	 * @public
	 */
	None: "None",

	/**
	 * Right-positioned single selection mode (only one list item can be selected).
	 * @public
	 */
	SingleSelect: "SingleSelect",

	/**
	 * Left-positioned single selection mode (only one list item can be selected).
	 * @public
	 */
	SingleSelectBegin: "SingleSelectBegin",

	/**
	 * Selected item is highlighted but no selection element is visible
	 * (only one list item can be selected).
	 * @public
	 */
	SingleSelectEnd: "SingleSelectEnd",

	/**
	 * Multi selection mode (more than one list item can be selected).
	 * @public
	 */
	MultiSelect: "MultiSelect",

	/**
	 * Delete mode (only one list item can be deleted via provided delete button)
	 * @public
	 */
	Delete: "Delete",
};

class ListMode extends DataType {
	static isValid(value) {
		return !!ListModes[value];
	}
}

ListMode.generataTypeAcessors(ListModes);

const rFocusable = /^(?:input|select|textarea|button)$/i,
	rClickable = /^(?:a|area)$/i;

class FocusHelper {
	static hasTabIndex(domElement) {
		if (domElement.disabled) {
			return false;
		}

		const tabIndex = domElement.getAttribute("tabindex");
		if (tabIndex !== null && tabIndex !== undefined) {
			return parseInt(tabIndex) >= 0;
		}

		return rFocusable.test(domElement.nodeName)
			|| (rClickable.test(domElement.nodeName)
			&& domElement.href);
	}

	static isHidden(domElement) {
		if (domElement.nodeName === "SLOT") {
			return false;
		}

		const rect = domElement.getBoundingClientRect();

		return (domElement.offsetWidth <= 0 && domElement.offsetHeight <= 0)
			|| domElement.style.visibility === "hidden"
			|| (rect.width === 0 && 0 && rect.height === 0);
	}

	static isVisible(domElement) {
		return !FocusHelper.isHidden(domElement);
	}

	static getCorrectElement(element) {
		if (element instanceof UI5Element) {
			// Focus the CustomElement itself or provide getDomRef of each ?
			return element.getFocusDomRef();
		}

		return element;
	}

	static findFocusableElement(container, forward) {
		let child;
		if (container.assignedNodes && container.assignedNodes()) {
			const assignedElements = container.assignedNodes();
			child = forward ? assignedElements[0] : assignedElements[assignedElements.length - 1];
		} else {
			child = forward ? container.firstChild : container.lastChild;
		}

		let focusableDescendant;

		while (child) {
			const originalChild = child;

			child = FocusHelper.getCorrectElement(child);
			if (!child) {
				return null;
			}

			if (child.nodeType === 1 && !FocusHelper.isHidden(child)) {
				if (FocusHelper.hasTabIndex(child)) {
					return child;
				}

				focusableDescendant = FocusHelper.findFocusableElement(child, forward);
				if (focusableDescendant) {
					return focusableDescendant;
				}
			}

			child = forward ? originalChild.nextSibling : originalChild.previousSibling;
		}

		return null;
	}

	static findFirstFocusableElement(container) {
		if (!container || FocusHelper.isHidden(container)) {
			return null;
		}

		return FocusHelper.findFocusableElement(container, true);
	}

	static findLastFocusableElement(container) {
		if (!container || FocusHelper.isHidden(container)) {
			return null;
		}

		return FocusHelper.findFocusableElement(container, false);
	}

	static hasTabbableContent(node) {
		let hasTabableContent = false,
			content = node.children; // eslint-disable-line

		if (content) {
			hasTabableContent = FocusHelper._hasTabbableContent(content);
		}

		// If the node is inside Custom Element,
		// check the content in the 'light' DOM.
		if (!hasTabableContent && FocusHelper._isInsideShadowRoot(node)) {
			const customElement = FocusHelper._getCustomElement(node);
			const content = customElement.children; // eslint-disable-line

			if (content) {
				hasTabableContent = FocusHelper._hasTabbableContent(content);
			}
		}

		return hasTabableContent;
	}

	static getLastTabbableElement(node) {
		const tabbableContent = FocusHelper.getTabbableContent(node);
		return tabbableContent.length ? tabbableContent[tabbableContent.length - 1] : null;
	}

	static getTabbableContent(node) {
		let aTabbableContent = [],
			content = node.children; // eslint-disable-line

		if (content) {
			aTabbableContent = FocusHelper._getTabbableContent(content);
		}

		if (FocusHelper._isInsideShadowRoot(node)) {
			const customElement = FocusHelper._getCustomElement(node);
			const content = customElement.children; // eslint-disable-line

			if (content) {
				aTabbableContent = [...aTabbableContent, ...FocusHelper._getTabbableContent(content)];
			}
		}

		return aTabbableContent;
	}

	static _getTabbableContent(nodes) {
		const aTabbableContent = [];

		Array.from(nodes).forEach(node => {
			let currentNode = node;

			while (currentNode) {
				if (FocusHelper._hasShadowRoot(currentNode)) {
					// as the content is in the <span> template and it is always 2nd child
					const children = currentNode.shadowRoot.children;
					currentNode = children.length === 1 ? children[0] : children[1];
				}

				if (FocusHelper._isNodeTabbable(currentNode)) {
					aTabbableContent.push(currentNode);
				}
				currentNode = currentNode.children && currentNode.children.length && currentNode.children[0];
			}
		});

		return aTabbableContent.filter(FocusHelper.isVisible);
	}

	static _hasTabbableContent(nodes) {
		let hasTabableContent = false;

		Array.from(nodes).forEach(node => {
			let currentNode = node;

			while (currentNode && !hasTabableContent) {
				if (FocusHelper._hasShadowRoot(currentNode)) {
					// as the content is in the <span> template and it is always 2nd child
					const children = currentNode.shadowRoot.children;
					currentNode = children.length === 1 ? children[0] : children[1];
				}

				hasTabableContent = FocusHelper._isNodeTabbable(currentNode);
				currentNode = currentNode.children.length && currentNode.children[0];
			}
		});

		return hasTabableContent;
	}

	static _isNodeTabbable(node) {
		if (!node) {
			return false;
		}

		const nodeName = node.nodeName.toLowerCase();

		if (node.hasAttribute("data-sap-no-tab-ref")) {
			return false;
		}

		// special tags
		if (nodeName === "a") {
			return !!node.href;
		}

		if (/input|select|textarea|button|object/.test(nodeName)) {
			return !node.disabled;
		}

		return FocusHelper.hasTabIndex(node);
	}

	static _hasShadowRoot(node) {
		return !!(node && node.shadowRoot);
	}

	static _isInsideShadowRoot(node) {
		return !!(node && node.getRootNode() && node.getRootNode().host);
	}

	static _getCustomElement(node) {
		return node.getRootNode().host;
	}
}

var styles = ":host(ui5-li:not([hidden])){display:block}:host(ui5-li) .sap-phone.sapMLIB{outline:none}ui5-li:not([hidden]){display:block}ui5-li .sap-phone.sapMLIB{outline:none}.sapMLIB{position:relative;display:flex;height:3rem;width:100%;padding:0 1rem 0 1rem;background:var(--ui5-listitem-background-color,var(--sapUiListBackground,var(--sapList_Background,var(--sapBaseColor,var(--sapPrimary3,#fff)))));box-sizing:border-box}.sapMLIBHoverable:hover{background:var(--sapUiListHoverBackground,var(--sapList_Hover_Background,#fafafa))}.sapMLIB.sapMLIBSelected{background:var(--sapUiListSelectionBackgroundColor,var(--sapList_SelectionBackgroundColor,#e5f0fa))}.sapMLIB.sapMLIBActive{color:var(--sapUiListActiveTextColor,#fff);background:var(--sapUiListActiveBackground,var(--sapUiListHighlightColor,var(--sapList_HighlightColor,var(--sapHighlightColor,#0854a0))))}.sapMLIB.sapMLIBHoverable.sapMLIBSelected:hover{background:var(--sapUiListSelectionHoverBackground,#d8e9f8)}.sapMLIB.sapMLIBHoverable.sapMLIBSelected.sapMLIBActive:hover{background:var(--sapUiListActiveBackground,var(--sapUiListHighlightColor,var(--sapList_HighlightColor,var(--sapHighlightColor,#0854a0))))}.sapMLIB.sapMLIBFocusable:focus{outline:none}.sapMLIB.sapMLIBFocusable .sapMLIBContent:focus:after,.sapMLIB.sapMLIBFocusable:focus:after{content:\"\";border:var(--_ui5_listitembase_focus_width,1px) dotted var(--sapUiContentFocusColor,var(--sapContent_FocusColor,#000));position:absolute;top:0;right:0;bottom:0;left:0;pointer-events:none}.sapMLIB.sapMLIBActive.sapMLIBFocusable .sapMLIBContent:focus,.sapMLIB.sapMLIBActive.sapMLIBFocusable:focus{outline-color:var(--sapUiContentContrastFocusColor,var(--sapContent_ContrastFocusColor,#fff))}.sapMLIB.sapMLIBBorder{border-bottom:var(--ui5-listitem-border-bottom,1px solid var(--sapUiListBorderColor,var(--sapList_BorderColor,#ededed)))}.sapMLIB.sapMLIBActive .sapMLIBIcon{color:var(--sapUiListActiveTextColor,#fff)}.sapMLIBIcon{color:var(--sapUiContentNonInteractiveIconColor,var(--sapContent_NonInteractiveIconColor,var(--sapPrimary7,#6a6d70)));padding-right:1rem}.sapMLIBContent{max-width:100%;min-height:100%;font-family:var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif))}.sapMLIBActionable,.sapMLIBActionable>.sapMLIBIcon{cursor:pointer}.sapMLIBFocusable.sapMLIBLegacyOutline:focus{outline:none}:host(ui5-li) [dir=rtl] .sapMLIBIcon{padding-left:1rem;padding-right:0}:host(ui5-li) [dir=rtl] .sapMSLIImg{margin:.5rem 0 .5rem .75rem}ui5-li [dir=rtl] .sapMLIBIcon{padding-left:1rem;padding-right:0}ui5-li [dir=rtl] .sapMSLIImg{margin:.5rem 0 .5rem .75rem}";

/**
 * @public
 */
const metadata$1 = {
	"abstract": true,
	properties: /** @lends  sap.ui.webcomponents.main.ListItemBase.prototype */  {

		_hideBorder: {
			type: Boolean,
		},

		_tabIndex: {
			type: String,
			defaultValue: "-1",
		},
	},
	events: {
		_focused: {},
		_focusForward: {},
	},
};

/**
 * A class to serve as a foundation
 * for the <code>ListItem</code> and <code>GroupHeaderListItem</code> classes.
 *
 * @abstract
 * @constructor
 * @author SAP SE
 * @alias sap.ui.webcomponents.main.ListItemBase
 * @extends UI5Element
 * @public
 */
class ListItemBase extends UI5Element {
	static get metadata() {
		return metadata$1;
	}

	static get styles() {
		return styles;
	}

	onfocusin(event) {
		this.fireEvent("_focused", event);
	}

	onkeydown(event) {
		if (isTabNext(event)) {
			return this._handleTabNext(event);
		}

		if (isTabPrevious(event)) {
			return this._handleTabPrevious(event);
		}
	}

	_handleTabNext(event) {
		const target = event.target.shadowRoot.activeElement;

		if (this.shouldForwardTabAfter(target)) {
			this.fireEvent("_forwardAfter", { item: target });
		}
	}

	_handleTabPrevious(event) {
		const target = event.target.shadowRoot.activeElement;

		if (this.shouldForwardTabBefore(target)) {
			const eventData = event;
			eventData.item = target;
			this.fireEvent("_forwardBefore", eventData);
		}
	}

	/*
	* Determines if th current list item either has no tabbable content or
	* [TAB] is performed onto the last tabbale content item.
	*/
	shouldForwardTabAfter(target) {
		const aContent = FocusHelper.getTabbableContent(this.getDomRef());

		if (target.getFocusDomRef) {
			target = target.getFocusDomRef();
		}

		return !aContent.length || (aContent[aContent.length - 1] === target);
	}

	/*
	* Determines if the current list item is target of [SHIFT+TAB].
	*/
	shouldForwardTabBefore(target) {
		return this.getDomRef() === target;
	}

	get classes() {
		return {
			main: {
				sapMLIBBorder: !this._hideBorder,
				sapMLIB: true,
				"sapMLIB-CTX": true,
				sapMLIBShowSeparator: true,
				sapMLIBFocusable: isDesktop(),
				"sap-phone": isPhone(),
				"sapUiSizeCompact": getCompactSize(),
			},
			inner: {
				sapMLIBContent: true,
			},
		};
	}

	get rtl() {
		return getEffectiveRTL() ? "rtl" : undefined;
	}
}

const features = new Map();

const getFeature = name => {
	return features.get(name);
};

class RadioButtonGroup {
	static hasGroup(groupName) {
		return this.groups.has(groupName);
	}

	static getGroup(groupName) {
		return this.groups.get(groupName);
	}

	static getSelectedRadioFromGroup(groupName) {
		return this.selectedRadios.get(groupName);
	}

	static removeGroup(groupName) {
		this.selectedRadios.delete(groupName);
		return this.groups.delete(groupName);
	}

	static addToGroup(radioBtn, groupName) {
		if (this.hasGroup(groupName)) {
			this.enforceSingleSelection(radioBtn, groupName);
			this.getGroup(groupName).push(radioBtn);
		} else {
			this.createGroup(radioBtn, groupName);
		}
	}

	static removeFromGroup(radioBtn, groupName) {
		if (!this.hasGroup(groupName)) {
			return;
		}

		const group = this.getGroup(groupName);
		const selectedRadio = this.getSelectedRadioFromGroup(groupName);

		// Remove the radio button from the given group
		group.forEach((_radioBtn, idx, arr) => {
			if (radioBtn._id === _radioBtn._id) {
				return arr.splice(idx, 1);
			}
		});

		if (selectedRadio === radioBtn) {
			this.selectedRadios.set(groupName, null);
		}

		// Remove the group if it is empty
		if (!group.length) {
			this.removeGroup(groupName);
		}
	}

	static createGroup(radioBtn, groupName) {
		if (radioBtn.selected) {
			this.selectedRadios.set(groupName, radioBtn);
		}

		this.groups.set(groupName, [radioBtn]);
	}

	static selectNextItem(item, groupName) {
		const group = this.getGroup(groupName),
			groupLength = group.length,
			currentItemPosition = group.indexOf(item);

		if (groupLength <= 1) {
			return;
		}

		const nextItemToSelect = this._nextSelectable(currentItemPosition, group);

		this.updateSelectionInGroup(nextItemToSelect, groupName);
	}

	static selectPreviousItem(item, groupName) {
		const group = this.getGroup(groupName),
			groupLength = group.length,
			currentItemPosition = group.indexOf(item);

		if (groupLength <= 1) {
			return;
		}

		const previousItemToSelect = this._previousSelectable(currentItemPosition, group);

		this.updateSelectionInGroup(previousItemToSelect, groupName);
	}

	static selectItem(item, groupName) {
		this.updateSelectionInGroup(item, groupName);
	}

	static updateSelectionInGroup(radioBtnToSelect, groupName) {
		const selectedRadio = this.getSelectedRadioFromGroup(groupName);

		this._deselectRadio(selectedRadio);
		this._selectRadio(radioBtnToSelect);
		this.selectedRadios.set(groupName, radioBtnToSelect);
	}

	static _deselectRadio(radioBtn) {
		if (radioBtn) {
			radioBtn.selected = false;
		}
	}

	static _selectRadio(radioBtn) {
		if (radioBtn) {
			radioBtn.focus();
			radioBtn.selected = true;
			radioBtn._selected = true;
			radioBtn.fireEvent("select");
		}
	}

	static _nextSelectable(pos, group) {
		const groupLength = group.length;
		let nextRadioToSelect = null;

		if (pos === groupLength - 1) {
			if (group[0].disabled || group[0].readonly) {
				return this._nextSelectable(1, group);
			}
			nextRadioToSelect = group[0];
		} else if (group[pos + 1].disabled || group[pos + 1].readonly) {
			return this._nextSelectable(pos + 1, group);
		} else {
			nextRadioToSelect = group[pos + 1];
		}

		return nextRadioToSelect;
	}

	static _previousSelectable(pos, group) {
		const groupLength = group.length;
		let previousRadioToSelect = null;
		if (pos === 0) {
			if (group[groupLength - 1].disabled || group[groupLength - 1].readonly) {
				return this._previousSelectable(groupLength - 1, group);
			}
			previousRadioToSelect = group[groupLength - 1];
		} else if (group[pos - 1].disabled || group[pos - 1].readonly) {
			return this._previousSelectable(pos - 1, group);
		} else {
			previousRadioToSelect = group[pos - 1];
		}

		return previousRadioToSelect;
	}

	static enforceSingleSelection(radioBtn, groupName) {
		const selectedRadio = this.getSelectedRadioFromGroup(groupName);

		if (radioBtn.selected) {
			if (!selectedRadio) {
				this.selectedRadios.set(groupName, radioBtn);
			} else if (radioBtn !== selectedRadio) {
				this._deselectRadio(selectedRadio);
				this.selectedRadios.set(groupName, radioBtn);
			}
		} else if (radioBtn === selectedRadio) {
			this.selectedRadios.set(groupName, null);
		}
	}

	static get groups() {
		if (!this._groups) {
			this._groups = new Map();
		}
		return this._groups;
	}

	static get selectedRadios() {
		if (!this._selectedRadios) {
			this._selectedRadios = new Map();
		}
		return this._selectedRadios;
	}
}

/*
	lit-html directive that removes and attribute if it is undefined
*/
var ifDefined = directive(value => part => {
	if ((value === undefined) && part instanceof AttributePart) {
		if (value !== part.value) {
			const name = part.committer.name;
			part.committer.element.removeAttribute(name);
		}
	} else if (part.committer && part.committer.element && part.committer.element.getAttribute(part.committer.name) === value) {
		part.setValue(noChange);
	} else {
		part.setValue(value);
	}
});

const block0 = (context) => { return html`<div class="${ifDefined(classMap(context.classes.main))}"	role="radio"	aria-checked="${ifDefined(context.selected)}"	aria-readonly="${ifDefined(context.ariaReadonly)}"	aria-disabled="${ifDefined(context.ariaDisabled)}"	tabindex="${ifDefined(context.tabIndex)}"	dir="${ifDefined(context.rtl)}"><div class='${ifDefined(classMap(context.classes.inner))}'><svg class="sapMRbSvg" focusable="false"><circle class="sapMRbSvgOuter" cx="${ifDefined(context.circle.x)}" cy="${ifDefined(context.circle.y)}" r="${ifDefined(context.circle.rOuter)}" stroke-width="${ifDefined(context.strokeWidth)}" fill="none" /><circle class="sapMRbSvgInner" cx="${ifDefined(context.circle.x)}" cy="${ifDefined(context.circle.y)}" r="${ifDefined(context.circle.rInner)}" stroke-width="10" /></svg><input type='radio' ?checked="${ifDefined(context.selected)}" ?readonly="${ifDefined(context.readonly)}" ?disabled="${ifDefined(context.disabled)}" name="${ifDefined(context.name)}" data-sap-no-tab-ref/></div>	${ context._label.text ? block1(context) : undefined }</div>`; };
const block1 = (context) => { return html`<ui5-label class="labelInRadioButton">${ifDefined(context._label.text)}</ui5-label>	`; };

var radioButtonCss = ":host(ui5-radiobutton:not([hidden])){max-width:100%;text-overflow:ellipsis;overflow:hidden;display:inline-block}ui5-radiobutton:not([hidden]){max-width:100%;text-overflow:ellipsis;overflow:hidden;display:inline-block}.sapMRb{position:relative;display:flex;flex-wrap:nowrap;outline:none;max-width:100%}.sapMRb.sapMRbSel .sapMRbSvgInner{fill:var(--_ui5_radiobutton_selected_fill,var(--sapUiSelected,var(--sapSelectedColor,var(--sapHighlightColor,#0854a0))))}.sapMRb.sapMRbDis{opacity:var(--sapUiContentDisabledOpacity,var(--sapContent_DisabledOpacity,.4))}.sapMRb:not(.sapMRbDis):focus:before{content:\"\";display:block;position:absolute;top:.5rem;bottom:.5rem;left:.5rem;right:.5rem;pointer-events:none;border:var(--_ui5_radiobutton_border_width,1px) dotted var(--sapUiContentFocusColor,var(--sapContent_FocusColor,#000))}.sapMRb.sapMRbHasLabel:focus:before{right:0}.sapMRb.sapMRbRo.sapMRbSel .sapMRbSvgInner{fill:var(--sapUiContentNonInteractiveIconColor,var(--sapContent_NonInteractiveIconColor,var(--sapPrimary7,#6a6d70)))}.sapMRb.sapMRbRo .sapMRbSvgOuter{fill:var(--sapUiFieldReadOnlyBackground,var(--sapField_ReadOnly_Background,hsla(0,0%,94.9%,.5)));stroke:var(--sapUiFieldReadOnlyBorderColor,var(--sapField_ReadOnly_BorderColor,var(--sapField_BorderColor,var(--sapPrimary5,#89919a))))}.sapMRb.sapMRbErr.sapMRbSel .sapMRbSvgInner{fill:var(--_ui5_radiobutton_selected_error_fill,var(--sapUiFieldInvalidColor,var(--sapField_InvalidColor,var(--sapErrorBorderColor,var(--sapNegativeColor,#b00)))))}.sapMRb.sapMRbErr .sapMRbSvgOuter,.sapMRb.sapMRbErr:hover .sapMRbInner.sapMRbHoverable:hover .sapMRbSvgOuter{stroke:var(--sapUiFieldInvalidColor,var(--sapField_InvalidColor,var(--sapErrorBorderColor,var(--sapNegativeColor,#b00))));fill:var(--sapUiFieldInvalidBackground,var(--sapField_InvalidBackground,var(--sapField_Background,var(--sapBaseColor,var(--sapPrimary3,#fff)))))}.sapMRb.sapMRbWarn.sapMRbSel .sapMRbSvgInner{fill:var(--_ui5_radiobutton_selected_warning_fill,var(--sapUiFieldWarningColorDarken100,#000))}.sapMRb.sapMRbWarn .sapMRbSvgOuter,.sapMRb.sapMRbWarn:hover .sapMRbInner.sapMRbHoverable:hover .sapMRbSvgOuter{stroke:var(--sapUiFieldWarningColor,var(--sapField_WarningColor,var(--sapWarningBorderColor,var(--sapCriticalColor,#e9730c))));fill:var(--sapUiFieldWarningBackground,var(--sapField_WarningBackground,var(--sapField_Background,var(--sapBaseColor,var(--sapPrimary3,#fff)))))}.sapMRb.sapMRbErr,.sapMRb.sapMRbWarn{stroke-dasharray:var(--_ui5_radiobutton_warning_error_border_dash,0)}.sapMRb .sapMRbInner{width:2.75rem;height:2.75rem;font-size:1rem;pointer-events:none;vertical-align:top;display:inline-block}.sapMRb .sapMRbInner:focus{outline:none}.sapMRb:not(.sapMRbWarn):not(.sapMRbErr):hover .sapMRbHoverable .sapMRbSvgOuter{fill:var(--_ui5_radiobutton_hover_fill,var(--sapUiFieldHoverBackground,var(--sapField_Hover_Background,var(--sapField_Background,var(--sapBaseColor,var(--sapPrimary3,#fff))))));stroke:var(--sapUiFieldHoverBorderColor,var(--sapField_Hover_BorderColor,var(--sapHighlightColor,#0854a0)))}.sapMRb .sapMRbInner input{margin:0;visibility:hidden;width:0}.sapMRb ui5-label.labelInRadioButton{width:calc(100% - 2.75rem);padding-right:1px;vertical-align:top;height:2.75rem;line-height:2.75rem;cursor:default;max-width:100%;text-overflow:ellipsis;overflow:hidden;pointer-events:none}.sapMRbSvg{height:2.75rem;width:2.75rem;pointer-events:none}.sapMRbSvg .sapMRbSvgOuter{stroke:var(--sapUiFieldBorderColor,var(--sapField_BorderColor,var(--sapPrimary5,#89919a)))}.sapMRbSvg .sapMRbSvgInner{fill:none}.sapUiSizeCompact.sapMRb{height:2rem}.sapUiSizeCompact.sapMRb:focus:before{top:.375rem;bottom:.375rem;left:.375rem;right:.325rem}.sapUiSizeCompact.sapMRb.sapMRbHasLabel:focus:before{right:0}.sapUiSizeCompact.sapMRb .sapMRbInner{width:2rem;height:2rem;display:flex;align-items:center;justify-content:center}.sapUiSizeCompact.sapMRb .sapMRbInner .sapMRbSvg{height:2rem;width:2rem;line-height:2rem}.sapUiSizeCompact.sapMRb ui5-label.labelInRadioButton{line-height:2rem;height:2rem;width:calc(100% - 2rem + 1px)}[dir=rtl].sapMRb.sapMRbHasLabel:focus:before{left:0;right:.5rem}span[dir=rtl].sapUiSizeCompact.sapMRb.sapMRbHasLabel:focus:before{left:0;right:.375rem}:host(ui5-radiobutton.singleSelectionRadioButton) .sapMRb .sapMRbInner .sapMRbSvgOuter{fill:var(--sapUiListBackground,var(--sapList_Background,var(--sapBaseColor,var(--sapPrimary3,#fff))))}ui5-radiobutton.singleSelectionRadioButton .sapMRb .sapMRbInner .sapMRbSvgOuter{fill:var(--sapUiListBackground,var(--sapList_Background,var(--sapBaseColor,var(--sapPrimary3,#fff))))}";

/**
 * @public
 */
const metadata$2 = {
	tag: "ui5-radiobutton",
	properties: /** @lends sap.ui.webcomponents.main.RadioButton.prototype */  {

		/**
		 * Determines whether the <code>ui5-radiobutton</code> is disabled.
		 * <br><br>
		 * <b>Note:</b> A disabled <code>ui5-radiobutton</code> is completely uninteractive.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		disabled: {
			type: Boolean,
		},

		/**
		 * Determines whether the <code>ui5-radiobutton</code> is read-only.
		 * <br><br>
		 * <b>Note:</b> A read-only <code>ui5-radiobutton</code> is not editable,
		 * but still provides visual feedback upon user interaction.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		readonly: {
			type: Boolean,
		},

		/**
		 * Determines whether the <code>ui5-radiobutton</code> is selected or not.
		 * <br><br>
		 * <b>Note:</b> The property value can be changed with user interaction,
		 * either by cliking/tapping on the <code>ui5-radiobutton</code>,
		 * or by using the Space or Enter key.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		selected: {
			type: Boolean,
		},

		/**
		 * Defines the text of the <code>ui5-radiobutton</code>.
		 *
		 * @type  {string}
		 * @public
		 */
		text: {
			type: String,
		},

		/**
		 * Defines the value state of the <code>ui5-radiobutton</code>.
		 * Available options are <code>Warning</code>, <code>Error</code>, and
		 * <code>None</code> (by default).
		 * <br><br>
		 * <b>Note:</b> Using the value states affects the visual appearance of
		 * the <code>ui5-radiobutton</code>.
		 *
		 * @type {string}
		 * @defaultvalue "None"
		 * @public
		 */
		valueState: {
			defaultValue: ValueState.None,
			type: ValueState,
		},

		/**
		 * Defines the name of the <code>ui5-radiobutton</code>.
		 * Radio buttons with the same <code>name</code> will form a radio button group.
		 * <br/><b>Note:</b>
		 * The selection can be changed with <code>ARROW_UP/DOWN</code> and <code>ARROW_LEFT/RIGHT</code> keys between radios in same group.
		 * <br/><b>Note:</b>
		 * Only one radio button can be selected per group.
		 * <br/>
		 * <b>Important:</b> For the <code>name</code> property to have effect when submitting forms, you must add the following import to your project:
		 * <code>import "@ui5/webcomponents/dist/features/InputElementsFormSupport.js";</code>
		 *
		 * <b>Note:</b> When set, a native <code>input</code> HTML element
		 * will be created inside the <code>ui5-radiobutton</code> so that it can be submitted as
		 * part of an HTML form.
		 *
		 * @type {string}
		 * @defaultvalue: ""
		 * @public
		 */
		name: {
			type: String,
		},

		/**
		 * Defines the form value of the <code>ui5-radiobutton</code>.
		 * When a form with a radio button group is submitted, the group's value
		 * will be the value of the currently selected radio button.
		 * <br/>
		 * <b>Important:</b> For the <code>value</code> property to have effect, you must add the following import to your project:
		 * <code>import "@ui5/webcomponents/dist/features/InputElementsFormSupport.js";</code>
		 *
		 * @type {string}
		 * @defaultvalue: ""
		 * @public
		 */
		value: {
			type: String,
		},

		_label: {
			type: Object,
		},
	},
	events: /** @lends sap.ui.webcomponents.main.RadioButton.prototype */ {

		/**
		 * Fired when the <code>ui5-radiobutton</code> selected state changes.
		 *
		 * @event
		 * @public
		 */
		select: {},
	},
};

const SVGConfig = {
	"compact": {
		x: 16,
		y: 16,
		rInner: 3,
		rOuter: 8,
	},
	"default": {
		x: 22,
		y: 22,
		rInner: 5,
		rOuter: 11,
	},
};

/**
 * @class
 *
 * <h3 class="comment-api-title">Overview</h3>
 *
 * The <code>ui5-radibutton</code> component enables users to select a single option from a set of options.
 * When a <code>ui5-radiobutton</code> is selected by the user, the
 * <code>select</code> event is fired.
 * When a <code>ui5-radiobutton</code> that is within a group is selected, the one
 * that was previously selected gets automatically deselected. You can group radio buttons by using the <code>name</code> property.
 * <br/>
 * Note: if <code>ui5-radiobutton</code> is not part of a group, it can be selected once, but can not be deselected back.
 *
 * <h3>Keyboard Handling</h3>
 *
 * Once the <code>ui5-radiobutton</code> is on focus, it might be selected by pressing the Space and Enter keys.
 * <br/>
 * The Arrow Down/Arrow Up and Arrow Left/Arrow Right keys can be used to change selection between next/previous radio buttons in one group,
 * while TAB and SHIFT + TAB can be used to enter or leave the radio button group.
 * <br/>
 * Note: On entering radio button group, the focus goes to the currently selected radio button.
 *
 * <h3>ES6 Module Import</h3>
 *
 * <code>import "@ui5/webcomponents/dist/RadioButton";</code>
 *
 * @constructor
 * @author SAP SE
 * @alias sap.ui.webcomponents.main.RadioButton
 * @extends sap.ui.webcomponents.base.UI5Element
 * @tagname ui5-radiobutton
 * @public
 */
class RadioButton extends UI5Element {
	static get metadata() {
		return metadata$2;
	}

	static get render() {
		return litRender;
	}

	static get template() {
		return block0;
	}

	static get styles() {
		return radioButtonCss;
	}

	constructor() {
		super();
		this._label = {};
	}

	onBeforeRendering() {
		this.syncLabel();
		this.syncGroup();

		this._enableFormSupport();
	}

	syncLabel() {
		this._label = Object.assign({}, this._label);
		this._label.text = this.text;
	}

	syncGroup() {
		const oldGroup = this._name;
		const currentGroup = this.name;

		if (currentGroup !== oldGroup) {
			if (oldGroup) {
				// remove the control from the previous group
				RadioButtonGroup.removeFromGroup(this, oldGroup);
			}

			if (currentGroup) {
				// add the control to the existing group
				RadioButtonGroup.addToGroup(this, currentGroup);
			}
		} else if (currentGroup) {
			RadioButtonGroup.enforceSingleSelection(this, currentGroup);
		}

		this._name = this.name;
	}

	_enableFormSupport() {
		const FormSupport = getFeature("FormSupport");
		if (FormSupport) {
			FormSupport.syncNativeHiddenInput(this, (element, nativeInput) => {
				nativeInput.disabled = element.disabled || !element.selected;
				nativeInput.value = element.selected ? element.value : "";
			});
		} else if (this.value) {
			console.warn(`In order for the "value" property to have effect, you should also: import "@ui5/webcomponents/dist/features/InputElementsFormSupport.js";`); // eslint-disable-line
		}
	}

	onclick() {
		return this.toggle();
	}

	_handleDown(event) {
		const currentGroup = this.name;

		if (!currentGroup) {
			return;
		}

		event.preventDefault();
		RadioButtonGroup.selectNextItem(this, currentGroup);
	}

	_handleUp(event) {
		const currentGroup = this.name;

		if (!currentGroup) {
			return;
		}

		event.preventDefault();
		RadioButtonGroup.selectPreviousItem(this, currentGroup);
	}

	onkeydown(event) {
		if (isSpace(event)) {
			return event.preventDefault();
		}

		if (isEnter(event)) {
			return this.toggle();
		}

		if (isDown(event) || isRight(event)) {
			this._handleDown(event);
		}

		if (isUp(event) || isLeft(event)) {
			this._handleUp(event);
		}
	}

	onkeyup(event) {
		if (isSpace(event)) {
			this.toggle();
		}
	}

	toggle() {
		if (!this.canToggle()) {
			return this;
		}

		if (!this.name) {
			this.selected = !this.selected;
			this.fireEvent("select");
			return this;
		}

		RadioButtonGroup.selectItem(this, this.name);
		return this;
	}

	canToggle() {
		return !(this.disabled || this.readonly || this.selected);
	}

	get classes() {
		return {
			main: {
				sapMRb: true,
				sapMRbHasLabel: this.text && this.text.length > 0,
				sapMRbSel: this.selected,
				sapMRbDis: this.disabled,
				sapMRbRo: this.readonly,
				sapMRbErr: this.valueState === "Error",
				sapMRbWarn: this.valueState === "Warning",
				sapUiSizeCompact: getCompactSize(),
			},
			inner: {
				sapMRbInner: true,
				sapMRbHoverable: !this.disabled && !this.readonly && isDesktop(),
			},
		};
	}

	get ariaReadonly() {
		return this.readonly ? "true" : undefined;
	}

	get ariaDisabled() {
		return this.disabled ? "true" : undefined;
	}

	get tabIndex() {
		return this.disabled || (!this.selected && this.name) ? "-1" : "0";
	}

	get strokeWidth() {
		return this.valueState === "None" ? "1" : "2";
	}

	get circle() {
		return getCompactSize() ? SVGConfig.compact : SVGConfig.default;
	}


	get rtl() {
		return getEffectiveRTL() ? "rtl" : undefined;
	}
}

RadioButton.define();

const block0$1 = (context) => { return html`<div	class="${ifDefined(classMap(context.classes.main))}"	role="checkbox"	aria-checked="${ifDefined(context.checked)}"	aria-readonly="${ifDefined(context.ariaReadonly)}"	aria-disabled="${ifDefined(context.ariaDisabled)}"	tabindex="${ifDefined(context.tabIndex)}"	dir="${ifDefined(context.rtl)}"><div id="${ifDefined(context._id)}-CbBg" class="${ifDefined(classMap(context.classes.inner))}"><input id="${ifDefined(context._id)}-CB" type='checkbox' ?checked="${ifDefined(context.checked)}" ?readonly="${ifDefined(context.readonly)}" ?disabled="${ifDefined(context.disabled)}" data-sap-no-tab-ref/></div>		${ context._label.text ? block1$1(context) : undefined }<slot name="formSupport"></slot></div>`; };
const block1$1 = (context) => { return html`<ui5-label class="ui5-checkbox-label" ?wrap="${ifDefined(context._label.wrap)}">${ifDefined(context._label.text)}</ui5-label>		`; };

const block0$2 = (context) => { return html`<label class="${ifDefined(classMap(context.classes.main))}" for="${ifDefined(context.for)}"><bdi id="${ifDefined(context._id)}-bdi"><slot></slot></bdi></label>`; };

var labelCss = ":host(ui5-label:not([hidden])){display:inline-flex;max-width:100%;color:var(--sapUiContentLabelColor,var(--sapContent_LabelColor,var(--sapPrimary7,#6a6d70)));font-family:var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif));font-size:var(--sapMFontMediumSize,.875rem);font-weight:400;cursor:text}ui5-label:not([hidden]){display:inline-block;max-width:100%;overflow:hidden;color:var(--sapUiContentLabelColor,var(--sapContent_LabelColor,var(--sapPrimary7,#6a6d70)));font-family:var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif));font-size:var(--sapMFontMediumSize,.875rem);font-weight:400;cursor:text}.sapMLabel{display:inline-block;width:100%;font-weight:inherit;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;cursor:inherit}.sapMLabel.sapMLabelWrapped{white-space:normal;line-height:1.4rem}.sapMLabel.sapMLabelRequired:before{position:relative;height:100%;display:inline-flex;align-items:flex-start;content:\"*\";color:var(--sapUiFieldRequiredColor,var(--sapField_RequiredColor,#a5175a));font-size:1.25rem;font-weight:700}";

/**
 * @public
 */
const metadata$3 = {
	tag: "ui5-label",
	properties: /** @lends sap.ui.webcomponents.main.Label.prototype */  {

		/**
		 * Defines whether an asterisk character is added to the <code>ui5-label</code> text.
		 * <br><br>
		 * <b>Note:</b> Usually indicates that user input is required.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		required: {
			type: Boolean,
		},

		/**
		 * Determines whether the <code>ui5-label</code> should wrap, when there is not enough space.
		 * <br><br>
		 * <b>Note:</b> By default the text would truncate.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		wrap: {
			type: Boolean,
		},

		/**
		 * Defines the labeled input by providing its ID.
		 * <br><br>
		 * <b>Note:</b> Can be used with both <code>ui5-input</code> and native input.
		 *
		 * @type {string}
		 * @defaultvalue ""
		 * @public
		 */
		"for": {
			type: String,
		},
	},
	slots: /** @lends sap.ui.webcomponents.main.Label.prototype */ {
		/**
		 * Defines the text of the <code>ui5-label</code>.
		 * <br><b>Note:</b> Аlthough this slot accepts HTML Elements, it is strongly recommended that you only use text in order to preserve the intended design.
		 *
		 * @type {Node[]}
		 * @slot
		 * @public
		 */
		"default": {
			type: Node,
		},
	},
};

/**
 * @class
 *
 * <h3 class="comment-api-title">Overview</h3>
 *
 * The <code>ui5-label</code> is a component used to represent a label,
 * providing valuable information to the user.
 * Usually it is placed next to a value holder, such as a text field.
 * It informs the user about what data is displayed or expected in the value holder.
 * The <code>ui5-label</code> is associated with its value holder by setting the
 * <code>labelFor</code> association.
 * <br><br>
 * The <code>ui5-label</code> appearance can be influenced by properties,
 * such as <code>required</code> and <code>wrap</code>.
 * The appearance of the Label can be configured in a limited way by using the design property.
 * For a broader choice of designs, you can use custom styles.
 *
 * <h3>ES6 Module Import</h3>
 *
 * <code>import "@ui5/webcomponents/dist/Label";</code>
 *
 * @constructor
 * @author SAP SE
 * @alias sap.ui.webcomponents.main.Label
 * @extends sap.ui.webcomponents.base.UI5Element
 * @tagname ui5-label
 * @public
 */
class Label extends UI5Element {
	static get metadata() {
		return metadata$3;
	}

	static get render() {
		return litRender;
	}

	static get template() {
		return block0$2;
	}

	static get styles() {
		return labelCss;
	}

	get classes() {
		return {
			main: {
				sapMLabel: true,
				sapMLabelNoText: !this.textContent.length,
				sapMLabelWrapped: this.wrap,
				sapMLabelRequired: this.required,
			},
		};
	}

	onclick() {
		const elementToFocus = document.getElementById(this.for);

		if (elementToFocus) {
			elementToFocus.focus();
		}
	}
}

Label.define();

var checkboxCss = ":host(ui5-checkbox:not([hidden])){display:inline-block;overflow:hidden;max-width:100%}ui5-checkbox:not([hidden]){display:inline-block;overflow:hidden;max-width:100%}.ui5-checkbox-wrapper{position:relative;display:inline-flex;align-items:center;width:100%;min-height:var(--_ui5_checkbox_width_height,2.75rem);min-width:var(--_ui5_checkbox_width_height,2.75rem);padding:0 var(--_ui5_checkbox_wrapper_padding,.6875rem);box-sizing:border-box;outline:none;-webkit-tap-highlight-color:rgba(0,0,0,0)}.ui5-checkbox-wrapper:not(.ui5-checkbox-with-label){justify-content:center}.ui5-checkbox-wrapper:after{content:\"\";min-height:inherit;font-size:0}.ui5-checkbox-wrapper.ui5-checkbox-with-label{padding-right:0}.ui5-checkbox-wrapper.ui5-checkbox-with-label:focus:before{right:0}.ui5-checkbox-wrapper.ui5-checkbox-with-label.ui5-checkbox--wrap{min-height:auto;padding-top:.6875rem;box-sizing:border-box;padding-bottom:.6875rem;align-items:flex-start}.ui5-checkbox-wrapper.ui5-checkbox-with-label.ui5-checkbox--wrap .ui5-checkbox-inner,.ui5-checkbox-wrapper.ui5-checkbox-with-label.ui5-checkbox--wrap .ui5-checkbox-label{margin-top:var(--_ui5_checkbox_wrapped_content_margin_top,0)}.ui5-checkbox--disabled{opacity:.5}.ui5-checkbox--error .ui5-checkbox-inner{background:var(--sapUiFieldInvalidBackground,var(--sapField_InvalidBackground,var(--sapField_Background,var(--sapBaseColor,var(--sapPrimary3,#fff)))));border:var(--_ui5_checkbox_inner_error_border,.125rem solid var(--sapUiFieldInvalidColor,var(--sapField_InvalidColor,var(--sapErrorBorderColor,var(--sapNegativeColor,#b00)))));color:var(--sapUiFieldInvalidColor,var(--sapField_InvalidColor,var(--sapErrorBorderColor,var(--sapNegativeColor,#b00))))}.ui5-checkbox--error.ui5-checkbox--hoverable:hover .ui5-checkbox-inner{background:var(--sapUiFieldInvalidBackground,var(--sapField_InvalidBackground,var(--sapField_Background,var(--sapBaseColor,var(--sapPrimary3,#fff)))));color:var(--sapUiFieldInvalidColor,var(--sapField_InvalidColor,var(--sapErrorBorderColor,var(--sapNegativeColor,#b00))));border-color:var(--sapUiFieldInvalidColor,var(--sapField_InvalidColor,var(--sapErrorBorderColor,var(--sapNegativeColor,#b00))))}.ui5-checkbox--error .ui5-checkbox-inner--checked:before{color:var(--sapUiFieldInvalidColor,var(--sapField_InvalidColor,var(--sapErrorBorderColor,var(--sapNegativeColor,#b00))))}.ui5-checkbox--warning .ui5-checkbox-inner{background:var(--sapUiFieldWarningBackground,var(--sapField_WarningBackground,var(--sapField_Background,var(--sapBaseColor,var(--sapPrimary3,#fff)))));border:var(--_ui5_checkbox_inner_warning_border,.125rem solid var(--sapUiFieldWarningColor,var(--sapField_WarningColor,var(--sapWarningBorderColor,var(--sapCriticalColor,#e9730c)))));color:var(--sapUiFieldWarningColor,var(--sapField_WarningColor,var(--sapWarningBorderColor,var(--sapCriticalColor,#e9730c))))}.ui5-checkbox--warning.ui5-checkbox--hoverable:hover .ui5-checkbox-inner{background:var(--sapUiFieldWarningBackground,var(--sapField_WarningBackground,var(--sapField_Background,var(--sapBaseColor,var(--sapPrimary3,#fff)))));color:var(--sapUiFieldWarningColor,var(--sapField_WarningColor,var(--sapWarningBorderColor,var(--sapCriticalColor,#e9730c))));border-color:var(--sapUiFieldWarningColor,var(--sapField_WarningColor,var(--sapWarningBorderColor,var(--sapCriticalColor,#e9730c))))}.ui5-checkbox--warning .ui5-checkbox-inner--checked:before{color:var(--_ui5_checkbox_checkmark_warning_color,var(--sapUiFieldWarningColorDarken100,#000))}.ui5-checkbox--hoverable:hover .ui5-checkbox-inner{background:var(--_ui5_checkbox_hover_background,var(--sapUiFieldHoverBackground,var(--sapField_Hover_Background,var(--sapField_Background,var(--sapBaseColor,var(--sapPrimary3,#fff))))));border-color:var(--sapUiFieldHoverBorderColor,var(--sapField_Hover_BorderColor,var(--sapHighlightColor,#0854a0)))}.ui5-checkbox--readonly:not(.ui5-checkbox--warning):not(.ui5-checkbox--error) .ui5-checkbox-inner{background:var(--sapUiFieldReadOnlyBackground,var(--sapField_ReadOnly_Background,hsla(0,0%,94.9%,.5)));border:var(--_ui5_checkbox_inner_readonly_border,1px solid var(--sapUiFieldReadOnlyBorderColor,var(--sapField_ReadOnly_BorderColor,var(--sapField_BorderColor,var(--sapPrimary5,#89919a)))));color:var(--sapUiContentNonInteractiveIconColor,var(--sapContent_NonInteractiveIconColor,var(--sapPrimary7,#6a6d70)))}.ui5-checkbox-wrapper:focus:before{content:\"\";position:absolute;top:var(--_ui5_checkbox_focus_position,.5625rem);left:var(--_ui5_checkbox_focus_position,.5625rem);right:var(--_ui5_checkbox_focus_position,.5625rem);bottom:var(--_ui5_checkbox_focus_position,.5625rem);border:var(--_ui5_checkbox_focus_outline,1px dotted var(--sapUiContentFocusColor,var(--sapContent_FocusColor,#000)))}.ui5-checkbox-wrapper.ui5-checkbox--wrap:focus:before{bottom:var(--_ui5_checkbox_wrapped_focus_left_top_bottom_position,.5625rem)}.ui5-checkbox-inner{display:flex;justify-content:center;align-items:center;min-width:var(--_ui5_checkbox_inner_width_height,1.375rem);max-width:var(--_ui5_checkbox_inner_width_height,1.375rem);height:var(--_ui5_checkbox_inner_width_height,1.375rem);max-height:var(--_ui5_checkbox_inner_width_height,1.375rem);border:var(--_ui5_checkbox_inner_border,.0625rem solid var(--sapUiFieldBorderColor,var(--sapField_BorderColor,var(--sapPrimary5,#89919a))));border-radius:var(--_ui5_checkbox_inner_border_radius,.125rem);background:var(--sapUiFieldBackground,var(--sapField_Background,var(--sapBaseColor,var(--sapPrimary3,#fff))));box-sizing:border-box;position:relative;cursor:default;pointer-events:none}.ui5-checkbox-inner--checked:before{content:\"\\e05b\";display:flex;position:absolute;justify-content:center;align-items:center;font-family:SAP-icons;color:var(--_ui5_checkbox_checkmark_color,var(--sapUiSelected,var(--sapSelectedColor,var(--sapHighlightColor,#0854a0))));width:100%;height:100%;left:0;top:0;user-select:none;-ms-user-select:none;-webkit-user-select:none;cursor:default}.ui5-checkbox-inner input{-webkit-appearance:none;visibility:hidden;width:0;left:0;position:absolute;font-size:inherit}.ui5-checkbox-wrapper .ui5-checkbox-label{margin-left:var(--_ui5_checkbox_wrapper_padding,.6875rem);cursor:default;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;pointer-events:none;user-select:none;-ms-user-select:none;-webkit-user-select:none}.sapUiSizeCompact.ui5-checkbox-wrapper{min-height:var(--_ui5_checkbox_compact_width_height,2rem);min-width:var(--_ui5_checkbox_compact_width_height,2rem);padding:0 var(--_ui5_checkbox_compact_wrapper_padding,.5rem)}.sapUiSizeCompact .ui5-checkbox-inner{max-height:var(--_ui5_checkbox_compact_inner_size,1rem);height:var(--_ui5_checkbox_compact_inner_size,1rem);max-width:var(--_ui5_checkbox_compact_inner_size,1rem);min-width:var(--_ui5_checkbox_compact_inner_size,1rem);font-size:.625rem}.sapUiSizeCompact.ui5-checkbox-wrapper:focus:before{top:var(--_ui5_checkbox_compact_focus_position,.375rem);left:var(--_ui5_checkbox_compact_focus_position,.375rem);right:var(--_ui5_checkbox_compact_focus_position,.375rem);bottom:var(--_ui5_checkbox_compact_focus_position,.375rem);border:var(--_ui5_checkbox_focus_outline,1px dotted var(--sapUiContentFocusColor,var(--sapContent_FocusColor,#000)))}.sapUiSizeCompact.ui5-checkbox-wrapper.ui5-checkbox-with-label.ui5-checkbox--wrap{min-height:auto;padding-top:var(--_ui5_checkbox_wrapped_focus_padding,.5rem);padding-bottom:var(--_ui5_checkbox_wrapped_focus_padding,.5rem)}.sapUiSizeCompact.ui5-checkbox-wrapper.ui5-checkbox-with-label.ui5-checkbox--wrap .ui5-checkbox-label{margin-top:var(--_ui5_checkbox_compact_wrapped_label_margin_top,-.125rem)}.sapUiSizeCompact.ui5-checkbox-wrapper.ui5-checkbox--wrap:focus:before{bottom:var(--_ui5_checkbox_compact_focus_position,.375rem)}.sapUiSizeCompact.ui5-checkbox-wrapper .ui5-checkbox-label{margin-left:var(--_ui5_checkbox_compact_wrapper_padding,.5rem);width:calc(100% - .8125rem - var(--_ui5_checkbox_compact_inner_size, 1rem))}[dir=rtl].ui5-checkbox-wrapper.ui5-checkbox-with-label{padding-left:0;padding-right:var(--_ui5_checkbox_wrapper_padding,.6875rem)}[dir=rtl].ui5-checkbox-wrapper.ui5-checkbox-with-label:focus:before{left:0;right:var(--_ui5_checkbox_focus_position,.5625rem)}[dir=rtl].ui5-checkbox-wrapper .ui5-checkbox-label{margin-left:0;margin-right:var(--_ui5_checkbox_compact_wrapper_padding,.5rem)}[dir=rtl].sapUiSizeCompact.ui5-checkbox-wrapper.ui5-checkbox-with-label{padding-right:var(--_ui5_checkbox_compact_wrapper_padding,.5rem)}[dir=rtl].sapUiSizeCompact.ui5-checkbox-wrapper.ui5-checkbox-with-label:focus:before{right:var(--_ui5_checkbox_compact_focus_position,.375rem)}";

/**
 * @public
 */
const metadata$4 = {
	tag: "ui5-checkbox",
	properties: /** @lends sap.ui.webcomponents.main.CheckBox.prototype */ {

		/**
		 * Defines whether the <code>ui5-checkbox</code> is disabled.
		 * <br><br>
		 * <b>Note:</b> A disabled <code>ui5-checkbox</code> is completely uninteractive.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		disabled: {
			type: Boolean,
		},

		/**
		 * Defines whether the <code>ui5-checkbox</code> is read-only.
		 * <br><br>
		 * <b>Note:</b> A red-only <code>ui5-checkbox</code> is not editable,
		 * but still provides visual feedback upon user interaction.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		readonly: {
			type: Boolean,
		},

		/**
		 * Defines if the <code>ui5-checkbox</code> is checked.
		 * <br><br>
		 * <b>Note:</b> The property can be changed with user interaction,
		 * either by cliking/tapping on the <code>ui5-checkbox</code>, or by
		 * pressing the Enter or Space key.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		checked: {
			type: Boolean,
		},

		/**
		 * Defines the text of the <code>ui5-checkbox</code>.
		 *
		 * @type {string}
		 * @defaultvalue ""
		 * @public
		 */
		text: {
			type: String,
		},

		/**
		 * Defines the value state of the <code>ui5-checkbox</code>.
		 * <br><br>
		 * <b>Note:</b> Available options are <code>Warning</code>, <code>Error</code>, and <code>None</code> (default).
		 *
		 * @type {string}
		 * @defaultvalue "None"
		 * @public
		 */
		valueState: {
			type: ValueState,
			defaultValue: ValueState.None,
		},

		/**
		 * Defines whether the <code>ui5-checkbox</code> text wraps when there is not enough space.
		 * <br><br>
		 * <b>Note:</b> By default, the text truncates when there is not enough space.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		wrap: {
			type: Boolean,
		},

		/**
		 * Determines the name with which the <code>ui5-checkbox</code> will be submitted in an HTML form.
		 *
		 * <b>Important:</b> For the <code>name</code> property to have effect, you must add the following import to your project:
		 * <code>import "@ui5/webcomponents/dist/features/InputElementsFormSupport.js";</code>
		 *
		 * <b>Note:</b> When set, a native <code>input</code> HTML element
		 * will be created inside the <code>ui5-checkbox</code> so that it can be submitted as
		 * part of an HTML form. Do not use this property unless you need to submit a form.
		 *
		 * @type {string}
		 * @defaultvalue ""
		 * @public
		 */
		name: {
			type: String,
		},

		_label: {
			type: Object,
		},
	},
	events: /** @lends sap.ui.webcomponents.main.CheckBox.prototype */ {

		/**
		 * Fired when the <code>ui5-checkbox</code> checked state changes.
		 *
		 * @public
		 * @event
		 */
		change: {},
	},
};

/**
 * @class
 *
 * <h3 class="comment-api-title">Overview</h3>
 *
 * Allows the user to set a binary value, such as true/false or yes/no for an item.
 * <br/><br/>
 * The <code>ui5-checkbox</code> component consists of a box and a label that describes its purpose.
 * If it's checked, an indicator is displayed inside the box.
 * To check/uncheck the <code>ui5-checkbox</code>, the user has to click or tap the square
 * box or its label.
 * <br/><br/>
 * Clicking or tapping toggles the <code>ui5-checkbox</code> between checked and unchecked state.
 * The <code>ui5-checkbox</code> component only has 2 states - checked and unchecked.
 *
 * <h3>Usage</h3>
 *
 * You can manually set the width of the element containing the box and the label using the <code>width</code> property.
 * If the text exceeds the available width, it is truncated.
 * The touchable area for toggling the <code>ui5-checkbox</code> ends where the text ends.
 * <br><br>
 * You can disable the <code>ui5-checkbox</code> by setting the <code>disabled</code> property to
 * <code>true</code>,
 * or use the <code>ui5-checkbox</code> in read-only mode by setting the <code>readonly</code>
 * property to <code>true</code>.
 *
 * <h3>ES6 Module Import</h3>
 *
 * <code>import "@ui5/webcomponents/dist/CheckBox";</code>
 *
 * @constructor
 * @author SAP SE
 * @alias sap.ui.webcomponents.main.CheckBox
 * @extends sap.ui.webcomponents.base.UI5Element
 * @tagname ui5-checkbox
 * @public
 */
class CheckBox extends UI5Element {
	static get metadata() {
		return metadata$4;
	}

	static get render() {
		return litRender;
	}

	static get template() {
		return block0$1;
	}

	static get styles() {
		return checkboxCss;
	}

	constructor() {
		super();
		this._label = {};
	}

	onBeforeRendering() {
		this.syncLabel();

		this._enableFormSupport();
	}

	syncLabel() {
		this._label = Object.assign({}, this._label);
		this._label.text = this.text;
		this._label.wrap = this.wrap;
		this._label.textDirection = this.textDirection;
	}

	_enableFormSupport() {
		const FormSupport = getFeature("FormSupport");
		if (FormSupport) {
			FormSupport.syncNativeHiddenInput(this, (element, nativeInput) => {
				nativeInput.disabled = element.disabled || !element.checked;
				nativeInput.value = element.checked ? "on" : "";
			});
		} else if (this.name) {
			console.warn(`In order for the "name" property to have effect, you should also: import "@ui5/webcomponents/dist/features/InputElementsFormSupport.js";`); // eslint-disable-line
		}
	}

	onclick() {
		this.toggle();
	}

	onkeydown(event) {
		if (isSpace(event)) {
			event.preventDefault();
		}

		if (isEnter(event)) {
			this.toggle();
		}
	}

	onkeyup(event) {
		if (isSpace(event)) {
			this.toggle();
		}
	}

	toggle() {
		if (this.canToggle()) {
			this.checked = !this.checked;
			this.fireEvent("change");
		}
		return this;
	}

	canToggle() {
		return !(this.disabled || this.readonly);
	}

	get classes() {
		return {
			main: {
				"ui5-checkbox-wrapper": true,
				"ui5-checkbox-with-label": !!this.text,
				"ui5-checkbox--disabled": this.disabled,
				"ui5-checkbox--readonly": this.readonly,
				"ui5-checkbox--error": this.valueState === "Error",
				"ui5-checkbox--warning": this.valueState === "Warning",
				"ui5-checkbox--wrap": this.wrap,
				"ui5-checkbox--hoverable": !this.disabled && !this.readonly && isDesktop(),
				"sapUiSizeCompact": getCompactSize(),
			},
			inner: {
				"ui5-checkbox-inner": true,
				"ui5-checkbox-inner-mark": true,
				"ui5-checkbox-inner--checked": !!this.checked,
			},
		};
	}

	get ariaReadonly() {
		return this.readonly ? "true" : undefined;
	}

	get ariaDisabled() {
		return this.disabled ? "true" : undefined;
	}

	get tabIndex() {
		return this.disabled ? undefined : "0";
	}

	get rtl() {
		return getEffectiveRTL() ? "rtl" : undefined;
	}

	static async define(...params) {
		await Label.define();

		super.define(...params);
	}
}

CheckBox.define();

/**
 * Different types of Button.
 */
const ButtonTypes = {
	/**
	 * default type (no special styling)
	 */
	Default: "Default",

	/**
	 * accept type (green button)
	 */
	Positive: "Positive",

	/**
	 * reject style (red button)
	 */
	Negative: "Negative",

	/**
	 * transparent type
	 */
	Transparent: "Transparent",

	/**
	 * emphasized type
	 */
	Emphasized: "Emphasized",
};

class ButtonDesign extends DataType {
	static isValid(value) {
		return !!ButtonTypes[value];
	}
}

ButtonDesign.generataTypeAcessors(ButtonTypes);

const block0$3 = (context) => { return html`<button		type="button"		class="${ifDefined(classMap(context.classes.main))}"		?disabled="${ifDefined(context.disabled)}"		data-sap-focus-ref				dir="${ifDefined(context.rtl)}"		@focusout=${ifDefined(context._onfocusout)}		@click=${ifDefined(context._onclick)}		@mousedown=${ifDefined(context._onmousedown)}	>		${ context.icon ? block1$2(context) : undefined }${ context.textContent ? block2(context) : undefined }</button>`; };
const block1$2 = (context) => { return html`<ui5-icon				class="${ifDefined(classMap(context.classes.icon))}"				src="${ifDefined(context.icon)}"			></ui5-icon>		`; };
const block2 = (context) => { return html`<span id="${ifDefined(context._id)}-content" class="${ifDefined(classMap(context.classes.text))}"><bdi><slot></slot></bdi></span>		`; };

const URI = {
    parse: (url) => {
        const [protocol, hostname] = url.split("://");
        const parts = { protocol, hostname, path: "/" };
        return parts;
    },
    build: ({ protocol, hostname }) => {
        return `${protocol}://${hostname}`;
    }
};

/* eslint-disable */

const SAP_ICON_FONT_FAMILY$1 = 'SAP-icons';

const iconMapping = {
	"accidental-leave": 0xe000, "account": 0xe001, "wrench": 0xe002, "windows-doors": 0xe003,
	"washing-machine": 0xe004, "visits": 0xe005, "video": 0xe006, "travel-expense": 0x1e007,
	"temperature": 0xe008, "task": 0x1e009, "synchronize": 0xe00a, "survey": 0x1e00b,
	"settings": 0xe00c, "search": 0x1e00d, "sales-document": 0x1e00e, "retail-store": 0xe00f,
	"refresh": 0xe010, "product": 0xe011, "present": 0xe012, "ppt-attachment": 0xe013,
	"pool": 0xe014, "pie-chart": 0xe015, "picture": 0xe016, "photo-voltaic": 0xe017,
	"phone": 0xe018, "pending": 0xe019, "pdf-attachment": 0xe01a, "past": 0x1e01b,
	"outgoing-call": 0xe01c, "opportunity": 0xe01d, "opportunities": 0x1e01e, "notes": 0xe01f,
	"money-bills": 0x1e020, "map": 0xe021, "log": 0xe022, "line-charts": 0xe023,
	"lightbulb": 0xe024, "leads": 0xe025, "lead": 0x1e026, "laptop": 0xe027,
	"kpi-managing-my-area": 0x1e028, "kpi-corporate-performance": 0x1e029, "incoming-call": 0xe02a, "inbox": 0xe02b,
	"horizontal-bar-chart": 0xe02c, "history": 0xe02d, "heating-cooling": 0xe02e, "gantt-bars": 0xe02f,
	"future": 0x1e030, "fridge": 0xe031, "fallback": 0xe032, "expense-report": 0x1e033,
	"excel-attachment": 0xe034, "energy-saving-lightbulb": 0xe035, "employee": 0xe036, "email": 0xe037,
	"edit": 0xe038, "duplicate": 0xe039, "download": 0xe03a, "doc-attachment": 0xe03b,
	"dishwasher": 0xe03c, "delete": 0xe03d, "decline": 0xe03e, "complete": 0x1e03f,
	"competitor": 0xe040, "collections-management": 0xe041, "chalkboard": 0x1e042, "cart": 0xe043,
	"card": 0xe044, "camera": 0xe045, "calendar": 0x1e046, "begin": 0xe047,
	"basket": 0xe048, "bar-chart": 0xe049, "attachment": 0xe04a, "arrow-top": 0xe04b,
	"arrow-right": 0xe04c, "arrow-left": 0xe04d, "arrow-bottom": 0xe04e, "approvals": 0x1e04f,
	"appointment": 0xe050, "alphabetical-order": 0x1e051, "along-stacked-chart": 0xe052, "alert": 0xe053,
	"addresses": 0xe054, "address-book": 0x1e055, "add-filter": 0xe056, "add-favorite": 0xe057,
	"add": 0xe058, "activities": 0x1e059, "action": 0xe05a, "accept": 0x1e05b,
	"hint": 0x1e05c, "group": 0xe05d, "check-availability": 0x1e05e, "weather-proofing": 0xe05f,
	"payment-approval": 0x1e060, "batch-payments": 0x1e061, "bed": 0xe062, "arobase": 0x1e063,
	"family-care": 0xe064, "favorite": 0xe065, "navigation-right-arrow": 0xe066, "navigation-left-arrow": 0xe067,
	"e-care": 0xe068, "less": 0xe069, "lateness": 0xe06a, "lab": 0xe06b,
	"internet-browser": 0xe06c, "instance": 0xe06d, "inspection": 0xe06e, "image-viewer": 0xe06f,
	"home": 0xe070, "grid": 0xe071, "goalseek": 0xe072, "general-leave-request": 0xe073,
	"create-leave-request": 0xe074, "flight": 0xe075, "filter": 0xe076, "favorite-list": 0xe077,
	"factory": 0xe078, "endoscopy": 0xe079, "employee-pane": 0xe07a, "employee-approvals": 0x1e07b,
	"email-read": 0xe07c, "electrocardiogram": 0xe07d, "documents": 0xe07e, "decision": 0xe07f,
	"database": 0xe080, "customer-history": 0xe081, "customer": 0xe082, "credit-card": 0xe083,
	"create-entry-time": 0xe084, "contacts": 0xe085, "compare": 0xe086, "clinical-order": 0xe087,
	"chain-link": 0xe088, "pull-down": 0xe089, "cargo-train": 0xe08a, "car-rental": 0xe08b,
	"business-card": 0xe08c, "bar-code": 0xe08d, "folder-blank": 0xe08e, "passenger-train": 0xe08f,
	"question-mark": 0x1e090, "world": 0xe091, "iphone": 0xe092, "ipad": 0xe093,
	"warning": 0xe094, "sort": 0xe095, "course-book": 0xe096, "course-program": 0xe097,
	"add-coursebook": 0xe098, "print": 0xe099, "save": 0xe09a, "play": 0x1e09b,
	"pause": 0xe09c, "record": 0xe09d, "response": 0xe09e, "pushpin-on": 0xe09f,
	"pushpin-off": 0xe0a0, "unfavorite": 0xe0a1, "learning-assistant": 0xe0a2, "timesheet": 0xe0a3,
	"time-entry-request": 0xe0a4, "list": 0xe0a5, "action-settings": 0xe0a6, "share": 0xe0a7,
	"feed": 0xe0a8, "role": 0xe0a9, "flag": 0x1e0aa, "post": 0xe0ab,
	"inspect": 0xe0ac, "inspect-down": 0xe0ad, "appointment-2": 0xe0ae, "target-group": 0xe0af,
	"marketing-campaign": 0xe0b0, "notification": 0xe0b1, "message-error": 0xe0b1, "comment": 0xe0b2,
	"shipping-status": 0xe0b3, "collaborate": 0xe0b4, "shortcut": 0xe0b5, "lead-outdated": 0x1e0b6,
	"tools-opportunity": 0xe0b7, "permission": 0xe0b8, "supplier": 0xe0b9, "table-view": 0xe0ba,
	"table-chart": 0xe0bb, "switch-views": 0xe0bc, "e-learning": 0xe0bd, "manager": 0xe0be,
	"switch-classes": 0xe0bf, "simple-payment": 0x1e0c0, "signature": 0xe0c1, "sales-order-item": 0x1e0c2,
	"sales-order": 0x1e0c3, "request": 0xe0c4, "receipt": 0xe0c5, "puzzle": 0xe0c6,
	"process": 0xe0c7, "private": 0xe0c8, "popup-window": 0xe0c9, "person-placeholder": 0xe0ca,
	"per-diem": 0x1e0cb, "paper-plane": 0xe0cc, "paid-leave": 0x1e0cd, "pdf-reader": 0x1e0ce,
	"overview-chart": 0xe0cf, "overlay": 0xe0d0, "org-chart": 0xe0d1, "number-sign": 0xe0d2,
	"notification-2": 0xe0d3, "my-sales-order": 0x1e0d4, "meal": 0xe0d5, "loan": 0x1e0d6,
	"order-status": 0x1e0d7, "customer-order-entry": 0x1e0d8, "performance": 0xe0d9, "menu": 0xe0da,
	"employee-lookup": 0xe0db, "education": 0xe0dc, "customer-briefing": 0xe0dd, "customer-and-contacts": 0xe0de,
	"my-view": 0xe0df, "accelerated": 0xe0e0, "to-be-reviewed": 0xe0e1, "warning2": 0xe0e2,
	"feeder-arrow": 0xe0e3, "quality-issue": 0xe0e4, "workflow-tasks": 0xe0e5, "create": 0xe0e6,
	"home-share": 0xe0e7, "globe": 0x1e0e8, "tags": 0xe0e9, "work-history": 0xe0ea,
	"x-ray": 0xe0eb, "wounds-doc": 0xe0ec, "web-cam": 0xe0ed, "waiver": 0x1e0ee,
	"vertical-bar-chart": 0xe0ef, "upstacked-chart": 0xe0f0, "trip-report": 0xe0f1, "microphone": 0xe0f2,
	"unpaid-leave": 0x1e0f3, "tree": 0xe0f4, "toaster-up": 0xe0f5, "toaster-top": 0xe0f6,
	"toaster-down": 0xe0f7, "time-account": 0xe0f8, "theater": 0xe0f9, "taxi": 0xe0fa,
	"subway-train": 0xe0fb, "study-leave": 0xe0fc, "stethoscope": 0xe0fd, "step": 0xe0fe,
	"sonography": 0xe0ff, "soccor": 0xe100, "physical-activity": 0xe101, "pharmacy": 0xe102,
	"official-service": 0xe103, "offsite-work": 0xe104, "nutrition-activity": 0xe105, "newspaper": 0xe106,
	"monitor-payments": 0x1e107, "map-2": 0xe108, "machine": 0xe109, "mri-scan": 0xe10a,
	"end-user-experience-monitoring": 0xe10b, "unwired": 0xe10c, "customer-financial-fact-sheet": 0x1e10d, "retail-store-manager": 0xe10e,
	"Netweaver-business-client": 0xe10f, "electronic-medical-record": 0xe110, "eam-work-order": 0x1e111, "customer-view": 0xe112,
	"crm-service-manager": 0xe113, "crm-sales": 0x1e114, "widgets": 0x1e115, "commission-check": 0x1e116,
	"collections-insight": 0x1e117, "clinical-tast-tracker": 0xe118, "citizen-connect": 0xe119, "cart-approval": 0x1e11a,
	"capital-projects": 0x1e11b, "bo-strategy-management": 0xe11c, "business-objects-mobile": 0xe11d, "business-objects-explorer": 0xe11e,
	"business-objects-experience": 0xe11f, "bbyd-dashboard": 0xe120, "bbyd-active-sales": 0x1e121, "business-by-design": 0x1e122,
	"business-one": 0x1e123, "sap-box": 0xe124, "manager-insight": 0xe125, "accounting-document-verification": 0x1e126,
	"hr-approval": 0x1e127, "idea-wall": 0xe128, "Chart-Tree-Map": 0xe129, "cart-5": 0xe12a,
	"cart-4": 0xe12b, "wallet": 0xe12c, "vehicle-repair": 0xe12d, "upload": 0xe12e,
	"unlocked": 0xe12f, "umbrella": 0xe130, "travel-request": 0x1e131, "travel-expense-report": 0x1e132,
	"travel-itinerary": 0xe133, "time-overtime": 0x1e134, "thing-type": 0xe135, "technical-object": 0xe136,
	"tag": 0xe137, "syringe": 0xe138, "syntax": 0xe139, "suitcase": 0xe13a,
	"simulate": 0xe13b, "shield": 0xe13c, "share-2": 0xe13d, "sales-quote": 0x1e13e,
	"repost": 0xe13f, "provision": 0xe140, "projector": 0xe141, "add-product": 0xe142,
	"pipeline-analysis": 0xe143, "add-photo": 0xe144, "palette": 0xe145, "nurse": 0xe146,
	"sales-notification": 0x1e147, "mileage": 0xe148, "meeting-room": 0xe149, "media-forward": 0x1e14a,
	"media-play": 0x1e14b, "media-pause": 0xe14c, "media-reverse": 0x1e14d, "media-rewind": 0x1e14e,
	"measurement-document": 0xe14f, "measuring-point": 0xe150, "measure": 0xe151, "map-3": 0xe152,
	"locked": 0xe153, "letter": 0xe154, "journey-arrive": 0xe155, "journey-change": 0xe156,
	"journey-depart": 0xe157, "it-system": 0xe158, "it-instance": 0xe159, "it-host": 0xe15a,
	"iphone-2": 0xe15b, "ipad-2": 0xe15c, "inventory": 0xe15d, "insurance-house": 0xe15e,
	"insurance-life": 0xe15f, "insurance-car": 0xe160, "initiative": 0xe161, "incident": 0x1e162,
	"group-2": 0xe163, "goal": 0xe164, "functional-location": 0xe165, "full-screen": 0xe166,
	"form": 0xe167, "fob-watch": 0xe168, "blank-tag": 0xe169, "family-protection": 0xe16a,
	"folder": 0xe16b, "fax-machine": 0xe16c, "example": 0xe16d, "eraser": 0xe16e,
	"employee-rejections": 0xe16f, "drop-down-list": 0xe170, "draw-rectangle": 0xe171, "document": 0xe172,
	"doctor": 0xe173, "discussion-2": 0xe174, "discussion": 0xe175, "dimension": 0xe176,
	"customer-and-supplier": 0xe177, "crop": 0xe178, "add-contact": 0xe179, "compare-2": 0xe17a,
	"color-fill": 0xe17b, "collision": 0xe17c, "curriculum": 0xe17d, "chart-axis": 0xe17e,
	"full-stacked-chart": 0xe17f, "full-stacked-column-chart": 0xe180, "vertical-bar-chart-2": 0xe181, "horizontal-bar-chart-2": 0xe182,
	"horizontal-stacked-chart": 0xe183, "vertical-stacked-chart": 0xe184, "choropleth-chart": 0x1e185, "geographic-bubble-chart": 0x1e186,
	"multiple-radar-chart": 0xe187, "radar-chart": 0xe188, "crossed-line-chart": 0xe189, "multiple-line-chart": 0xe18a,
	"multiple-bar-chart": 0xe18b, "line-chart": 0xe18c, "line-chart-dual-axis": 0xe18d, "bubble-chart": 0xe18e,
	"scatter-chart": 0xe18f, "multiple-pie-chart": 0xe190, "column-chart-dual-axis": 0xe191, "tag-cloud-chart": 0xe192,
	"area-chart": 0xe193, "cause": 0xe194, "cart-3": 0xe195, "cart-2": 0xe196,
	"bus-public-transport": 0xe197, "burglary": 0xe198, "building": 0xe199, "border": 0xe19a,
	"bookmark": 0xe19b, "badge": 0xe19c, "attachment-audio": 0xe19d, "attachment-video": 0xe19e,
	"attachment-html": 0xe19f, "attachment-photo": 0xe1a0, "attachment-e-pub": 0xe1a1, "attachment-zip-file": 0xe1a2,
	"attachment-text-file": 0xe1a3, "add-equipment": 0xe1a4, "add-activity": 0x1e1a5, "activity-individual": 0xe1a6,
	"activity-2": 0x1e1a7, "add-activity-2": 0x1e1a8, "activity-items": 0xe1a9, "activity-assigned-to-goal": 0xe1aa,
	"status-completed": 0xe1ab, "status-positive": 0xe1ab, "status-error": 0xe1ac, "status-negative": 0xe1ac,
	"status-inactive": 0xe1ad, "status-in-process": 0xe1ae, "status-critical": 0xe1ae, "blank-tag-2": 0xe1af,
	"cart-full": 0xe1b0, "locate-me": 0xe1b1, "paging": 0xe1b2, "company-view": 0xe1b3,
	"document-text": 0xe1b4, "explorer": 0xe1b5, "personnel-view": 0xe1b6, "sorting-ranking": 0xe1b7,
	"drill-down": 0xe1b8, "drill-up": 0xe1b9, "vds-file": 0xe1ba, "sap-logo-shape": 0x1e1bb,
	"folder-full": 0xe1bc, "system-exit": 0xe1bd, "system-exit-2": 0xe1be, "close-command-field": 0xe1bf,
	"open-command-field": 0xe1c0, "sys-enter-2": 0x1e1c1, "sys-enter": 0x1e1c2, "sys-help-2": 0x1e1c3,
	"sys-help": 0x1e1c4, "sys-back": 0xe1c5, "sys-back-2": 0xe1c6, "sys-cancel": 0xe1c7,
	"sys-cancel-2": 0xe1c8, "open-folder": 0xe1c9, "sys-find-next": 0xe1ca, "sys-find": 0xe1cb,
	"sys-monitor": 0xe1cc, "sys-prev-page": 0xe1cd, "sys-first-page": 0xe1ce, "sys-next-page": 0xe1cf,
	"sys-last-page": 0xe1d0, "generate-shortcut": 0xe1d1, "create-session": 0xe1d2, "display-more": 0xe1d3,
	"enter-more": 0xe1d4, "zoom-in": 0xe1d5, "zoom-out": 0xe1d6, "header": 0xe1d7,
	"detail-view": 0xe1d8, "show-edit": 0xe1d8, "collapse": 0xe1d9, "expand": 0xe1da, "positive": 0xe1db,
	"negative": 0xe1dc, "display": 0xe1dd, "menu2": 0xe1de, "redo": 0xe1df,
	"undo": 0xe1e0, "navigation-up-arrow": 0xe1e1, "navigation-down-arrow": 0xe1e2, "down": 0xe1e3,
	"up": 0xe1e4, "shelf": 0xe1e5, "background": 0xe1e6, "resize": 0xe1e7,
	"move": 0xe1e8, "show": 0xe1e9, "hide": 0xe1ea, "nav-back": 0xe1eb,
	"error": 0xe1ec, "slim-arrow-right": 0xe1ed, "slim-arrow-left": 0xe1ee, "slim-arrow-down": 0xe1ef,
	"slim-arrow-up": 0xe1f0, "forward": 0xe1f1, "overflow": 0xe1f2, "value-help": 0xe1f3,
	"multi-select": 0x1e1f4, "exit-full-screen": 0xe1f5, "sys-add": 0xe1f6, "sys-minus": 0xe1f7,
	"dropdown": 0xe1f8, "expand-group": 0xe1f9, "collapse-group": 0xe200, "vertical-grip": 0xe1fa,
	"horizontal-grip": 0xe1fb, "sort-descending": 0xe1fc, "sort-ascending": 0xe1fd, "arrow-down": 0xe1fe,
	"legend": 0xe1ff, "message-warning": 0xe201, "message-information": 0x1e202, "message-success": 0x1e203,
	"restart": 0xe204, "stop": 0xe205, "add-process": 0xe206, "cancel-maintenance": 0xe207,
	"activate": 0xe208, "resize-horizontal": 0xe209, "resize-vertical": 0xe20a, "connected": 0xe20b,
	"disconnected": 0xe20c, "edit-outside": 0xe20d, "key": 0xe20e, "minimize": 0xe20f,
	"back-to-top": 0xe210, "hello-world": 0xe211, "outbox": 0xe212, "donut-chart": 0xe213,
	"heatmap-chart": 0xe214, "horizontal-bullet-chart": 0xe215, "vertical-bullet-chart": 0xe216, "call": 0xe217,
	"download-from-cloud": 0xe218, "upload-to-cloud": 0xe219, "jam": 0xe21a, "sap-ui5": 0xe21b,
	"message-popup": 0xe21c, "cloud": 0xe21d, "horizontal-waterfall-chart": 0x1e21e, "vertical-waterfall-chart": 0x1e21f,
	"broken-link": 0xe220, "headset": 0xe221, "thumb-up": 0x1e222, "thumb-down": 0x1e223,
	"multiselect-all": 0x1e224, "multiselect-none": 0x1e225, "scissors": 0xe226, "sound": 0x1e227,
	"sound-loud": 0x1e228, "sound-off": 0x1e229, "date-time": 0x1e22a, "user-settings": 0xe22b,
	"key-user-settings": 0xe22c, "developer-settings": 0xe22d, "text-formatting": 0x1e22e, "bold-text": 0x1e22f,
	"italic-text": 0x1e230, "underline-text": 0x1e231, "text-align-justified": 0x1e232, "text-align-left": 0x1e233,
	"text-align-center": 0x1e234, "text-align-right": 0x1e235, "bullet-text": 0x1e236, "numbered-text": 0x1e237,
	"co": 0xe238, "ui-notifications": 0xe239, "bell": 0xe23a, "cancel-share": 0xe23b,
	"write-new-document": 0xe23c, "write-new": 0xe23d, "cancel": 0x1e23e, "screen-split-one": 0xe23f,
	"screen-split-two": 0xe240, "screen-split-three": 0xe241, "customize": 0xe242, "user-edit": 0xe243,
	"source-code": 0xe244, "copy": 0xe245, "paste": 0xe246, "line-chart-time-axis": 0x1e247,
	"clear-filter": 0xe248, "reset": 0xe249, "trend-up": 0xe24a, "trend-down": 0xe24b,
	"cursor-arrow": 0xe24c, "add-document": 0xe24d, "create-form": 0xe24e, "resize-corner": 0xe24f,
	"chevron-phase": 0xe250, "chevron-phase-2": 0xe251, "rhombus-milestone": 0xe252, "rhombus-milestone-2": 0xe253,
	"circle-task": 0xe254, "circle-task-2": 0xe255, "project-definition-triangle": 0xe256, "project-definition-triangle-2": 0xe257,
	"master-task-triangle": 0xe258, "master-task-triangle-2": 0xe259, "program-triangles": 0xe25a, "program-triangles-2": 0xe25b,
	"mirrored-task-circle": 0xe25c, "mirrored-task-circle-2": 0xe25d, "checklist-item": 0xe25e, "checklist-item-2": 0xe25f,
	"checklist": 0xe260, "checklist-2": 0xe261, "chart-table-view": 0xe262, "filter-analytics": 0xe263, "filter-facets": 0xe264,
	"filter-fields": 0xe265, "indent": 0xe266, "outdent": 0xe267, "heading1": 0x1e268, "heading2": 0x1e269, "heading3": 0x1e26a,
	"decrease-line-height": 0xe26b, "increase-line-height": 0xe26c, "fx": 0x1e26d, "add-folder": 0xe26e, "away": 0xe26f,
	"busy": 0xe270, "appear-offline": 0xe271, "blur": 0xe272, "pixelate": 0xe273,
	"horizontal-combination-chart": 0xe274, "add-employee": 0xe275, "text-color": 0x1e276,
	"browse-folder": 0xe277, "primary-key": 0xe278, "two-keys": 0xe279,
	"strikethrough": 0xe27a, "text": 0xe27b, "responsive": 0xe27c, "desktop-mobile": 0xe27d,
	"table-row": 0xe27e, "table-column": 0xe27f, "validate": 0x1e280, "keyboard-and-mouse": 0xe281,
	"touch": 0xe282, "expand-all": 0xe283, "collapse-all": 0xe284, "combine": 0xe285, "split": 0xe286
};

/* eslint-enable */
const getIconURI = iconName => {
	return `sap-icon://${iconName}`;
};

const getIconInfo = iconURI => {
	if (!isIconURI(iconURI)) {
		console.warn(`Invalid icon URI ${iconURI}`); /* eslint-disable-line */
		return;
	}

	let iconName = URI.parse(iconURI).hostname;

	/* when "sap-icon://" is skipped, but icon is valid */
	if (iconURI.indexOf("sap-icon://") === -1) {
		iconName = URI.parse(iconURI).protocol;
	}

	return {
		fontFamily: SAP_ICON_FONT_FAMILY$1,
		uri: getIconURI(iconName),
		content: `${stringFromCharCode(iconMapping[iconName])}`,
	};
};

const isIconURI = uri => {
	return /sap-icon:\/\//.test(uri) || iconMapping.hasOwnProperty(uri); /* eslint-disable-line */
};

const stringFromCharCode = code => {
	return String.fromCharCode(typeof code === "number" ? code : parseInt(code, 16));
};

const block0$4 = (context) => { return html`<span	class="${ifDefined(classMap(context.classes.main))}"	style="${ifDefined(context.fontStyle)}"	tabindex="-1"	data-sap-ui-icon-content="${ifDefined(context.iconContent)}"	dir="${ifDefined(context.dir)}"></span>`; };

var iconCss = ":host(ui5-icon:not([hidden])){display:inline-block;outline:none;color:var(--sapUiContentNonInteractiveIconColor,var(--sapContent_NonInteractiveIconColor,var(--sapPrimary7,#6a6d70)))}ui5-icon:not([hidden]){display:inline-block;outline:none;color:var(--sapUiContentNonInteractiveIconColor,var(--sapContent_NonInteractiveIconColor,var(--sapPrimary7,#6a6d70)))}.sapWCIcon{width:100%;height:100%;display:flex;justify-content:center;align-items:center;outline:none;border-style:none;pointer-events:none}.sapWCIcon:before{content:attr(data-sap-ui-icon-content);speak:none;font-weight:400;-webkit-font-smoothing:antialiased;display:flex;justify-content:center;align-items:center;width:100%;height:100%;pointer-events:none}[dir=rtl].sapWCIconMirrorInRTL:not(.sapWCIconSuppressMirrorInRTL):after,[dir=rtl].sapWCIconMirrorInRTL:not(.sapWCIconSuppressMirrorInRTL):before{transform:scaleX(-1)}";

/**
 * @public
 */
const metadata$5 = {
	tag: "ui5-icon",
	properties: /** @lends sap.ui.webcomponents.main.Icon.prototype */ {

		/**
		 * Defines the source URI of the <code>ui5-icon</code>.
		 * <br><br>
		 * SAP-icons font provides numerous options. To find all the available icons, see the
		 * <ui5-link target="_blank" href="https://openui5.hana.ondemand.com/test-resources/sap/m/demokit/iconExplorer/webapp/index.html" class="api-table-content-cell-link">Icon Explorer</ui5-link>.
		 * <br><br>
		 * Example:
		 * <br>
		 * <code>src='sap-icons://add'</code>, <code>src='sap-icons://delete'</code>, <code>src='sap-icons://employee'</code>.
		 *
		 * @type {string}
		 * @public
		*/
		src: {
			type: String,
		},
	},
	events: {
		press: {},
	},
};

/**
 * @class
 * <h3 class="comment-api-title">Overview</h3>
 *
 * The <code>ui5-icon</code> component is a wrapper around the HTML tag to embed an icon from an icon font.
 * There are two main scenarios how the <code>ui5-icon</code> component is used:
 * as a purely decorative element; or as a visually appealing clickable area in the form of an icon button.
 * In the first case, images are not predefined as tab stops in accessibility mode.
 * <br><br>
 * The <code>ui5-icon</code> uses embedded font instead of pixel image.
 * Comparing to image, <code>ui5-icon</code> is easily scalable,
 * its color can be altered live, and various effects can be added using CSS.
 * <br><br>
 * A large set of built-in icons is available
 * and they can be used by setting the <code>src</code> property on the <code>ui5-icon</code>.
 *
 * <h3>ES6 Module Import</h3>
 *
 * <code>import "@ui5/webcomponents/dist/Icon";</code>
 *
 * @constructor
 * @author SAP SE
 * @alias sap.ui.webcomponents.main.Icon
 * @extends sap.ui.webcomponents.base.UI5Element
 * @tagname ui5-icon
 * @public
 */
class Icon extends UI5Element {
	static get metadata() {
		return metadata$5;
	}

	static get render() {
		return litRender;
	}

	static get template() {
		return block0$4;
	}

	static get styles() {
		return iconCss;
	}

	focus() {
		HTMLElement.prototype.focus.call(this);
	}

	onclick() {
		this.fireEvent("press");
	}

	onkeydown(event) {
		if (isSpace(event)) {
			event.preventDefault();
			this.__spaceDown = true;
		} else if (isEnter(event)) {
			this.onclick(event);
		}
	}

	onkeyup(event) {
		if (isSpace(event) && this.__spaceDown) {
			this.fireEvent("press");
			this.__spaceDown = false;
		}
	}

	get classes() {
		const iconInfo = getIconInfo(this.src) || {};
		return {
			main: {
				sapWCIcon: true,
				sapWCIconMirrorInRTL: !iconInfo.suppressMirroring,
			},
		};
	}

	get iconContent() {
		const iconInfo = getIconInfo(this.src) || {};
		return iconInfo.content;
	}

	get dir() {
		return getEffectiveRTL() ? "rtl" : "ltr";
	}

	get fontStyle() {
		const iconInfo = getIconInfo(this.src) || {};
		return `font-family: '${iconInfo.fontFamily}'`;
	}
}

Icon.define();

var buttonCss = ":host(ui5-button:not([hidden])){display:inline-block}ui5-button:not([hidden]){display:inline-block}:host([disabled]){pointer-events:none}ui5-button[disabled]{pointer-events:none}button[dir=rtl].sapMBtn.sapMBtnWithIcon .sapMBtnText{margin-right:var(--_ui5_button_base_icon_margin,.375rem);margin-left:0}button[dir=rtl].sapMBtn.sapMBtnIconEnd .sapWCIconInButton{margin-right:var(--_ui5_button_base_icon_margin,.375rem);margin-left:0}button.sapUiSizeCompact .sapWCIconInButton{font-size:1rem}button.sapUiSizeCompact.sapMBtn{padding:var(--_ui5_button_compact_padding,0 .4375rem);min-height:var(--_ui5_button_compact_height,1.625rem);min-width:var(--_ui5_button_base_min_compact_width,2rem)}ui5-button .sapMBtn:before{content:\"\";min-height:inherit;font-size:0}.sapMBtn{width:100%;height:100%;min-width:var(--_ui5_button_base_min_width,2.25rem);min-height:var(--_ui5_button_base_height,2.25rem);font-family:var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif));font-size:var(--sapMFontMediumSize,.875rem);font-weight:400;box-sizing:border-box;padding:var(--_ui5_button_base_padding,0 .5625rem);border-radius:var(--_ui5_button_border_radius,.25rem);border-width:.0625rem;cursor:pointer;display:flex;justify-content:center;align-items:center;background-color:var(--sapUiButtonBackground,var(--sapButton_Background,var(--sapBaseColor,var(--sapPrimary3,#fff))));border:1px solid var(--sapUiButtonBorderColor,var(--sapButton_BorderColor,#0854a0));color:var(--sapUiButtonTextColor,var(--sapButton_TextColor,#0854a0));text-shadow:var(--sapUiShadowText,0 0 .125rem var(--sapUiContentContrastShadowColor,var(--sapContent_ContrastShadowColor,#fff)));outline:none;position:relative}.sapMBtn:not(.sapMBtnActive):hover{background:var(--sapUiButtonHoverBackground,var(--sapButton_Hover_Background,#ebf5fe))}.sapMBtn .sapWCIconInButton{font-size:var(--_ui5_button_base_icon_only_font_size,1rem);position:relative;color:inherit}.sapMBtn.sapMBtnIconEnd{flex-direction:row-reverse}.sapMBtn.sapMBtnIconEnd .sapWCIconInButton{margin-left:var(--_ui5_button_base_icon_margin,.375rem)}.sapMBtn.sapMBtnNoText{padding:var(--_ui5_button_base_icon_only_padding,0 .5625rem)}.sapMBtnText{outline:none;position:relative}.sapMBtn.sapMBtnWithIcon .sapMBtnText{margin-left:var(--_ui5_button_base_icon_margin,.375rem)}.sapMBtnDisabled{opacity:.5;pointer-events:none}.sapMBtn:focus:after{content:\"\";position:absolute;border:var(--_ui5_button_focus_after_border,1px dotted var(--sapUiContentFocusColor,var(--sapContent_FocusColor,#000)));top:var(--_ui5_button_focus_after_top,1px);bottom:var(--_ui5_button_focus_after_bottom,1px);left:var(--_ui5_button_focus_after_left,1px);right:var(--_ui5_button_focus_after_right,1px)}.sapMBtn::-moz-focus-inner{border:0}.sapMBtnActive{background-image:none;background-color:var(--sapUiButtonActiveBackground,var(--sapUiActive,var(--sapActiveColor,var(--sapHighlightColor,#0854a0))));border-color:var(--_ui5_button_active_border_color,var(--sapUiButtonActiveBorderColor,var(--sapUiButtonActiveBackground,var(--sapUiActive,var(--sapActiveColor,var(--sapHighlightColor,#0854a0))))));color:var(--sapUiButtonActiveTextColor,#fff);text-shadow:none}.sapMBtnActive:focus:after{border-color:var(--sapUiContentContrastFocusColor,var(--sapContent_ContrastFocusColor,#fff))}.sapMBtn.sapMBtnPositive{background-color:var(--sapUiButtonAcceptBackground,var(--sapButton_Accept_Background,var(--sapButton_Background,var(--sapBaseColor,var(--sapPrimary3,#fff)))));border-color:var(--_ui5_button_positive_border_color,var(--sapUiButtonAcceptBorderColor,var(--sapUiPositiveElement,var(--sapPositiveElementColor,var(--sapPositiveColor,#107e3e)))));color:var(--sapUiButtonAcceptTextColor,#107e3e);text-shadow:var(--sapUiShadowText,0 0 .125rem var(--sapUiContentContrastShadowColor,var(--sapContent_ContrastShadowColor,#fff)))}.sapMBtn.sapMBtnPositive:hover{background-color:var(--sapUiButtonAcceptHoverBackground,var(--sapUiSuccessBG,var(--sapSuccessBackground,#f1fdf6)));border-color:var(--_ui5_button_positive_border_hover_color,var(--sapUiButtonAcceptHoverBorderColor,var(--sapUiButtonAcceptBorderColor,var(--sapUiPositiveElement,var(--sapPositiveElementColor,var(--sapPositiveColor,#107e3e))))))}.sapMBtn.sapMBtnPositive.sapMBtnActive{background-color:var(--sapUiButtonAcceptActiveBackground,#0d6733);border-color:var(--_ui5_button_positive_border_active_color,var(--sapUiButtonAcceptActiveBorderColor,var(--sapUiButtonAcceptActiveBackground,#0d6733)));color:var(--sapUiButtonActiveTextColor,#fff);text-shadow:none}.sapMBtn.sapMBtnPositive:focus{border-color:var(--_ui5_button_positive_focus_border_color,var(--sapUiButtonAcceptBorderColor,var(--sapUiPositiveElement,var(--sapPositiveElementColor,var(--sapPositiveColor,#107e3e)))))}.sapMBtn.sapMBtnPositive.sapMBtnActive:focus:after{border-color:var(--sapUiContentContrastFocusColor,var(--sapContent_ContrastFocusColor,#fff))}.sapMBtn.sapMBtnPositive:focus:after{border-color:var(--_ui5_button_positive_border_focus_hover_color,var(--sapUiContentFocusColor,var(--sapContent_FocusColor,#000)))}.sapMBtn.sapMBtnNegative{background-color:var(--sapUiButtonRejectBackground,var(--sapButton_Reject_Background,var(--sapButton_Background,var(--sapBaseColor,var(--sapPrimary3,#fff)))));border-color:var(--sapUiButtonRejectBorderColor,var(--sapUiNegativeElement,var(--sapNegativeElementColor,var(--sapNegativeColor,#b00))));color:var(--sapUiButtonRejectTextColor,#b00);text-shadow:var(--sapUiShadowText,0 0 .125rem var(--sapUiContentContrastShadowColor,var(--sapContent_ContrastShadowColor,#fff)))}.sapMBtn.sapMBtnNegative:hover{background-color:var(--sapUiButtonRejectHoverBackground,var(--sapUiErrorBG,var(--sapErrorBackground,#ffebeb)));border-color:var(--sapUiButtonRejectHoverBorderColor,var(--sapUiButtonRejectBorderColor,var(--sapUiNegativeElement,var(--sapNegativeElementColor,var(--sapNegativeColor,#b00)))))}.sapMBtn.sapMBtnNegative:focus{border-color:var(--_ui5_button_negative_focus_border_color,var(--sapUiButtonRejectBorderColor,var(--sapUiNegativeElement,var(--sapNegativeElementColor,var(--sapNegativeColor,#b00)))))}.sapMBtn.sapMBtnNegative.sapMBtnActive{background-color:var(--sapUiButtonRejectActiveBackground,#a20000);border-color:var(--_ui5_button_negative_active_border_color,var(--sapUiButtonRejectActiveBorderColor,var(--sapUiButtonRejectActiveBackground,#a20000)));color:var(--sapUiButtonActiveTextColor,#fff);text-shadow:none}.sapMBtn.sapMBtnNegative.sapMBtnActive:focus:after{border-color:var(--sapUiContentContrastFocusColor,var(--sapContent_ContrastFocusColor,#fff))}.sapMBtn.sapMBtnNegative:focus:after{border-color:var(--_ui5_button_positive_border_focus_hover_color,var(--sapUiContentFocusColor,var(--sapContent_FocusColor,#000)))}.sapMBtn.sapMBtnEmphasized{background-color:var(--sapUiButtonEmphasizedBackground,var(--sapButton_Emphasized_Background,var(--sapBrandColor,var(--sapPrimary2,#0a6ed1))));border-color:var(--sapUiButtonEmphasizedBorderColor,var(--sapButton_Emphasized_BorderColor,var(--sapButton_Emphasized_Background,var(--sapBrandColor,var(--sapPrimary2,#0a6ed1)))));color:var(--sapUiButtonEmphasizedTextColor,var(--sapButton_Emphasized_TextColor,#fff));text-shadow:0 0 .125rem var(--sapUiButtonEmphasizedTextShadow,transparent);font-weight:var(--_ui5_button_emphasized_font_weight,bold)}.sapMBtn.sapMBtnEmphasized:hover{background-color:var(--sapUiButtonEmphasizedHoverBackground,#085caf);border-color:var(--sapUiButtonEmphasizedHoverBorderColor,var(--sapUiButtonEmphasizedHoverBackground,#085caf))}.sapMBtn.sapMBtnEmphasized.sapMBtnActive{background-color:var(--sapUiButtonEmphasizedActiveBackground,#0854a0);border-color:var(--sapUiButtonEmphasizedActiveBorderColor,var(--sapUiButtonEmphasizedActiveBackground,#0854a0));color:var(--sapUiButtonActiveTextColor,#fff);text-shadow:none}.sapMBtn.sapMBtnEmphasized.sapMBtnActive:focus:after,.sapMBtn.sapMBtnEmphasized:focus:after{border-color:var(--sapUiContentContrastFocusColor,var(--sapContent_ContrastFocusColor,#fff))}.sapMBtn.sapMBtnEmphasized:focus{border-color:var(--_ui5_button_emphasized_focused_border_color,var(--sapUiButtonEmphasizedBorderColor,var(--sapButton_Emphasized_BorderColor,var(--sapButton_Emphasized_Background,var(--sapBrandColor,var(--sapPrimary2,#0a6ed1))))))}.sapMBtn.sapMBtnTransparent{background-color:var(--sapUiButtonLiteBackground,transparent);border-color:var(--sapUiButtonLiteBorderColor,transparent);color:var(--sapUiButtonLiteTextColor,var(--sapUiButtonTextColor,var(--sapButton_TextColor,#0854a0)));text-shadow:var(--sapUiShadowText,0 0 .125rem var(--sapUiContentContrastShadowColor,var(--sapContent_ContrastShadowColor,#fff)));border-color:transparent}.sapMBtn.sapMBtnTransparent:hover{background-color:var(--sapUiButtonLiteHoverBackground,var(--sapUiButtonHoverBackground,var(--sapButton_Hover_Background,#ebf5fe)))}.sapMBtn.sapMBtnTransparent.sapMBtnActive{background-color:var(--sapUiButtonLiteActiveBackground,var(--sapUiButtonActiveBackground,var(--sapUiActive,var(--sapActiveColor,var(--sapHighlightColor,#0854a0)))));color:var(--sapUiButtonActiveTextColor,#fff);text-shadow:none}.sapMBtn.sapMBtnTransparent:hover:not(.sapMBtnActive){border-color:transparent}";

/**
 * @public
 */
const metadata$6 = {
	tag: "ui5-button",
	properties: /** @lends sap.ui.webcomponents.main.Button.prototype */ {

		/**
		 * Defines the <code>ui5-button</code> design.
		 * </br></br>
		 * <b>Note:</b> Available options are "Default", "Emphasized", "Positive",
		 * "Negative", and "Transparent".
		 *
		 * @type {ButtonDesign}
		 * @defaultvalue "Default"
		 * @public
		 */
		design: {
			type: ButtonDesign,
			defaultValue: ButtonDesign.Default,
		},

		/**
		 * Defines whether the <code>ui5-button</code> is disabled
		 * (default is set to <code>false</code>).
		 * A disabled <code>ui5-button</code> can't be pressed or
		 * focused, and it is not in the tab chain.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		disabled: {
			type: Boolean,
		},

		/**
		 * Defines the icon to be displayed as graphical element within the <code>ui5-button</code>.
		 * The SAP-icons font provides numerous options.
		 * <br><br>
		 * Example:
		 * <br>
		 * <pre>ui5-button icon="sap-icon://palette"</pre>
		 *
		 * See all the available icons in the <ui5-link target="_blank" href="https://openui5.hana.ondemand.com/test-resources/sap/m/demokit/iconExplorer/webapp/index.html" class="api-table-content-cell-link">Icon Explorer</ui5-link>.
		 *
		 * @type {string}
		 * @defaultvalue ""
		 * @public
		 */
		icon: {
			type: String,
		},

		/**
		 * Defines whether the icon should be displayed after the <code>ui5-button</code> text.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		iconEnd: {
			type: Boolean,
		},

		/**
		 * When set to <code>true</code>, the <code>ui5-button</code> will
		 * automatically submit the nearest form element upon <code>press</code>.
		 *
		 * <b>Important:</b> For the <code>submits</code> property to have effect, you must add the following import to your project:
		 * <code>import "@ui5/webcomponents/dist/features/InputElementsFormSupport.js";</code>
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		submits: {
			type: Boolean,
		},

		/**
		 * Used to switch the active state (pressed or not) of the <code>ui5-button</code>.
		 */
		_active: {
			type: Boolean,
		},

		_iconSettings: {
			type: Object,
		},
	},
	slots: /** @lends sap.ui.webcomponents.main.Button.prototype */ {
		/**
		 * Defines the text of the <code>ui5-button</code>.
		 * <br><b>Note:</b> Аlthough this slot accepts HTML Elements, it is strongly recommended that you only use text in order to preserve the intended design.
		 *
		 * @type {Node[]}
		 * @slot
		 * @public
		 */
		"default": {
			type: Node,
		},
	},
	events: /** @lends sap.ui.webcomponents.main.Button.prototype */ {

		/**
		 * Fired when the <code>ui5-button</code> is activated either with a
		 * mouse/tap or by using the Enter or Space key.
		 * <br><br>
		 * <b>Note:</b> The event will not be fired if the <code>disabled</code>
		 * property is set to <code>true</code>.
		 *
		 * @event
		 * @public
		 */
		click: {},
	},
};

/**
 * @class
 *
 * <h3 class="comment-api-title">Overview</h3>
 *
 * The <code>ui5-button</code> component represents a simple push button.
 * It enables users to trigger actions by clicking or tapping the <code>ui5-button</code>, or by pressing
 * certain keyboard keys, such as Enter.
 *
 *
 * <h3>Usage</h3>
 *
 * For the <code>ui5-button</code> UI, you can define text, icon, or both. You can also specify
 * whether the text or the icon is displayed first.
 * <br><br>
 * You can choose from a set of predefined types that offer different
 * styling to correspond to the triggered action.
 * <br><br>
 * You can set the <code>ui5-button</code> as enabled or disabled. An enabled
 * <code>ui5-button</code> can be pressed by clicking or tapping it. The button changes
 * its style to provide visual feedback to the user that it is pressed or hovered over with
 * the mouse cursor. A disabled <code>ui5-button</code> appears inactive and cannot be pressed.
 *
 * <h3>ES6 Module Import</h3>
 *
 * <code>import "@ui5/webcomponents/dist/Button";</code>
 *
 * @constructor
 * @author SAP SE
 * @alias sap.ui.webcomponents.main.Button
 * @extends UI5Element
 * @tagname ui5-button
 * @public
 */
class Button extends UI5Element {
	static get metadata() {
		return metadata$6;
	}

	static get styles() {
		return buttonCss;
	}

	static get render() {
		return litRender;
	}

	static get template() {
		return block0$3;
	}

	constructor() {
		super();

		this._deactivate = () => {
			if (this._active) {
				this._active = false;
			}
		};
	}

	onBeforeRendering() {
		const FormSupport = getFeature("FormSupport");
		if (this.submits && !FormSupport) {
			console.warn(`In order for the "submits" property to have effect, you should also: import "@ui5/webcomponents/dist/features/InputElementsFormSupport.js";`); // eslint-disable-line
		}
	}

	onEnterDOM() {
		document.addEventListener("mouseup", this._deactivate);
	}

	onExitDOM() {
		document.removeEventListener("mouseup", this._deactivate);
	}

	_onclick(event) {
		event.isMarked = "button";
		this.fireEvent("press", {});
		const FormSupport = getFeature("FormSupport");
		if (FormSupport) {
			FormSupport.triggerFormSubmit(this);
		}
	}

	_onmousedown(event) {
		event.isMarked = "button";
		this._active = true;
	}

	onmouseup(event) {
		event.isMarked = "button";
	}

	onkeydown(event) {
		if (isSpace(event) || isEnter(event)) {
			this._active = true;
		}
	}

	onkeyup(event) {
		if (isSpace(event) || isEnter(event)) {
			this._active = false;
		}
	}

	_onfocusout(_event) {
		this._active = false;
	}

	get classes() {
		return {
			main: {
				sapMBtn: true,
				sapMBtnActive: this._active,
				sapMBtnWithIcon: this.icon,
				sapMBtnNoText: !this.textContent.length,
				sapMBtnDisabled: this.disabled,
				sapMBtnIconEnd: this.iconEnd,
				[`sapMBtn${this.design}`]: true,
				sapUiSizeCompact: getCompactSize(),
			},
			icon: {
				sapWCIconInButton: true,
			},
			text: {
				sapMBtnText: true,
			},
		};
	}

	get rtl() {
		return getEffectiveRTL() ? "rtl" : undefined;
	}

	static async define(...params) {
		await Icon.define();

		super.define(...params);
	}
}

Button.define();

var styles$1 = ".sapMSLI.sapMLIBActive .sapMSLI-info,.sapMSLI.sapMLIBActive .sapMSLIDescription,.sapMSLI.sapMLIBActive .sapMSLITitle{color:var(--sapUiListActiveTextColor,#fff)}.sapMSLI .sapMSLITextWrapper{display:flex;flex-direction:column;min-width:1px;line-height:normal;flex:auto}.sapMSLI .sapMSLITitle{font-size:var(--sapMFontLargeSize,1rem);color:var(--sapUiListTextColor,var(--sapUiBaseText,var(--sapTextColor,var(--sapPrimary6,#32363a))))}.sapMSLI .sapMSLIDescription,.sapMSLI .sapMSLITitle{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sapMSLI .sapMSLIDescription{font-size:var(--sapMFontMediumSize,.875rem);color:var(--sapUiContentLabelColor,var(--sapContent_LabelColor,var(--sapPrimary7,#6a6d70)))}.sapMSLI-info{margin:0 .25rem;color:var(--sapUiNeutralText,var(--sapNeutralTextColor,var(--sapNeutralColor,#6a6d70)));font-size:.875rem;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sapMSLI-info--warning{color:var(--sapUiCriticalText,var(--sapCriticalTextColor,var(--sapCriticalColor,#e9730c)))}.sapMSLI-info--success{color:var(--sapUiPositiveText,var(--sapPositiveTextColor,var(--sapPositiveColor,#107e3e)))}.sapMSLI-info--error{color:var(--sapUiNegativeText,var(--sapNegativeTextColor,var(--sapNegativeColor,#b00)))}.sapMSLI .sapMSLIImg{margin:.5rem .75rem .5rem 0;height:2rem;width:2rem}.sapMSLI .sapMLIBContent{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;-webkit-box-flex:1;flex:auto;display:-webkit-box;display:flex;-webkit-box-align:center;align-items:center}.sapMSLI .sapMDeleteListItemButton{display:flex;align-items:center}.sapMSLI.sapMSLIWithTitleAndDescription,.sapUiSizeCompact.sapMSLI.sapMSLIWithTitleAndDescription{height:5rem;padding:1rem}.sapMSLI.sapMSLIWithTitleAndDescription .sapMSLITitle,.sapUiSizeCompact.sapMSLI.sapMSLIWithTitleAndDescription .sapMSLITitle{padding-bottom:.375rem}.sapMSLI.sapMSLIWithTitleAndDescription .sapMSLI-info{align-self:flex-end}.sapUiSizeCompact.sapMSLI:not(.sapMSLIWithTitleAndDescription){height:2rem}.sapUiSizeCompact.sapMSLI:not(.sapMSLIWithTitleAndDescription) .sapMSLITitle{height:2rem;line-height:2rem;font-size:var(--sapMFontMediumSize,.875rem)}.sapUiSizeCompact.sapMSLI:not(.sapMSLIWithTitleAndDescription) .sapMSLIImg{margin-top:.55rem;height:1.75rem;width:1.75rem}.sapUiSizeCompact ui5-checkbox.multiSelectionCheckBox{margin-right:.5rem}";

/**
 * @public
 */
const metadata$7 = {
	"abstract": true,
	properties: /** @lends  sap.ui.webcomponents.main.ListItem.prototype */ {

		/**
		 * Defines the selected state of the <code>ListItem</code>.
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		selected: {
			type: Boolean,
		},

		/**
		 * Defines the visual indication and behavior of the list items.
		 * Available options are <code>Active</code> (by default) and <code>Inactive</code>.
		 * </br></br>
		 * <b>Note:</b> When set to <code>Active</code>, the item will provide visual response upon press and hover,
		 * while with type <code>Inactive</code> - will not.
		 *
		 * @type {string}
		 * @defaultvalue "Active"
		 * @public
		*/
		type: {
			type: ListItemType,
			defaultValue: ListItemType.Active,
		},

		_active: {
			type: Boolean,
		},

		_mode: {
			type: ListMode,
			defaultValue: ListMode.None,
		},
	},
	events: {
		_press: {},
		_detailPress: {},
		_focused: {},
		_focusForward: {},
	},
};

/**
 * @class
 * A class to serve as a base
 * for the <code>StandardListItem</code> and <code>CustomListItem</code> classes.
 *
 * @constructor
 * @author SAP SE
 * @alias sap.ui.webcomponents.main.ListItem
 * @extends ListItemBase
 * @public
 */
class ListItem extends ListItemBase {
	static get metadata() {
		return metadata$7;
	}

	static get styles() {
		return [styles$1, ListItemBase.styles];
	}

	constructor(props) {
		super(props);

		this.deactivateByKey = event => {
			if (isEnter(event)) {
				this.deactivate();
			}
		};

		this.deactivate = () => {
			if (this._active) {
				this._active = false;
			}
		};
	}

	onBeforeRendering() {}

	onEnterDOM() {
		document.addEventListener("mouseup", this.deactivate);
		document.addEventListener("keyup", this.deactivateByKey);
	}

	onExitDOM() {
		document.removeEventListener("mouseup", this.deactivate);
		document.removeEventListener("keyup", this.deactivateByKey);
	}

	onkeydown(event) {
		super.onkeydown(event);

		const itemActive = this.type === ListItemType.Active;

		if (isSpace(event)) {
			event.preventDefault();
		}

		if ((isSpace(event) || isEnter(event)) && itemActive) {
			this.activate();
		}

		if (isEnter(event)) {
			this.fireItemPress();
		}
	}

	onkeyup(event) {
		if (isSpace(event) || isEnter(event)) {
			this.deactivate();
		}

		if (isSpace(event)) {
			this.fireItemPress();
		}
	}

	onmousedown(event) {
		if (event.isMarked === "button") {
			return;
		}
		this.activate();
	}

	onmouseup(event) {
		if (event.isMarked === "button") {
			return;
		}
		this.deactivate();
	}

	onfocusout(event) {
		this.deactivate();
	}

	onclick(event) {
		if (event.isMarked === "button") {
			return;
		}
		this.fireItemPress();
	}

	activate() {
		if (this.type === ListItemType.Active) {
			this._active = true;
		}
	}


	_onDelete(event) {
		this.fireEvent("_selectionRequested", { item: this, selected: event.selected });
	}

	fireItemPress() {
		this.fireEvent("_press", { item: this, selected: this.selected });
	}

	get classes() {
		const result = super.classes;

		const desktop = isDesktop();
		const isActionable = (this.type === ListItemType.Active) && (this._mode !== ListMode.Delete);

		// Modify main classes
		result.main[`sapMLIBType${this.type}`] = true;
		result.main.sapMSLI = true;
		result.main.sapMLIBActionable = desktop && isActionable;
		result.main.sapMLIBHoverable = desktop && isActionable;
		result.main.sapMLIBSelected = this.selected;
		result.main.sapMLIBActive = this._active;

		return result;
	}

	get placeSelectionElementBefore() {
		return this._mode === ListMode.MultiSelect
			|| this._mode === ListMode.SingleSelectBegin;
	}

	get placeSelectionElementAfter() {
		return !this.placeSelectionElementBefore
			&& (this._mode === ListMode.SingleSelectEnd || this._mode === ListMode.Delete);
	}

	get modeSingleSelect() {
		return [
			ListMode.SingleSelectBegin,
			ListMode.SingleSelectEnd,
			ListMode.SingleSelect,
		].includes(this._mode);
	}

	get modeMultiSelect() {
		return this._mode === ListMode.MultiSelect;
	}

	get modeDelete() {
		return this._mode === ListMode.Delete;
	}
}

const block0$5 = (context) => { return html`<li	tabindex="${ifDefined(context._tabIndex)}"	class="${ifDefined(classMap(context.classes.main))}"	dir="${ifDefined(context.rtl)}"	@focusin="${ifDefined(context.onfocusin)}"	@focusout="${ifDefined(context.onfocusout)}">		${ context.placeSelectionElementBefore ? block1$3(context) : undefined }<div id="${ifDefined(context._id)}-content" class="${ifDefined(classMap(context.classes.inner))}">			${ context.displayImage ? block5(context) : undefined }${ context.displayIconBegin ? block6(context) : undefined }<div class="sapMSLITextWrapper">		${ context.textContent.length ? block7() : undefined }${ context.description ? block8(context) : undefined }</div>	${ context.info ? block9(context) : undefined }</div>		${ context.displayIconEnd ? block10(context) : undefined }${ context.placeSelectionElementAfter ? block11(context) : undefined }</li>`; };
const block1$3 = (context) => { return html`${ context.modeSingleSelect ? block2$1(context) : undefined }${ context.modeMultiSelect ? block3(context) : undefined }${ context.modeDelete ? block4(context) : undefined }`; };
const block2$1 = (context) => { return html`<ui5-radiobutton				id="${ifDefined(context._id)}-singleSelectionElement"				class="singleSelectionRadioButton"				?selected="${ifDefined(context.selected)}"></ui5-radiobutton>	`; };
const block3 = (context) => { return html`<ui5-checkbox				id="${ifDefined(context._id)}-multiSelectionElement"				class="multiSelectionCheckBox"				?checked="${ifDefined(context.selected)}"></ui5-checkbox>	`; };
const block4 = (context) => { return html`<div class="sapMDeleteListItemButton"><ui5-button				id="${ifDefined(context._id)}-deleteSelectionElement"				design="Transparent"				icon="sap-icon://decline"				@ui5-press="${ifDefined(context._onDelete)}"			></ui5-button></div>	`; };
const block5 = (context) => { return html`<img src="${ifDefined(context.image)}" class="sapMSLIImg">	`; };
const block6 = (context) => { return html`<ui5-icon src="${ifDefined(context.icon)}" class="sapMLIBIcon"></ui5-icon>	`; };
const block7 = (context) => { return html`<span class="sapMSLITitle"><slot></slot></span>		`; };
const block8 = (context) => { return html`<span class="sapMSLIDescription">${ifDefined(context.description)}</span>		`; };
const block9 = (context) => { return html`<span class="${ifDefined(classMap(context.classes.info))}">${ifDefined(context.info)}</span>	`; };
const block10 = (context) => { return html`<ui5-icon src="${ifDefined(context.icon)}" class="sapMLIBIcon"></ui5-icon>	`; };
const block11 = (context) => { return html`${ context.modeSingleSelect ? block12(context) : undefined }${ context.modeMultiSelect ? block13(context) : undefined }${ context.modeDelete ? block14(context) : undefined }`; };
const block12 = (context) => { return html`<ui5-radiobutton				id="${ifDefined(context._id)}-singleSelectionElement"				class="singleSelectionRadioButton"				?selected="${ifDefined(context.selected)}"></ui5-radiobutton>	`; };
const block13 = (context) => { return html`<ui5-checkbox				id="${ifDefined(context._id)}-multiSelectionElement"				class="multiSelectionCheckBox"				?checked="${ifDefined(context.selected)}"></ui5-checkbox>	`; };
const block14 = (context) => { return html`<div class="sapMDeleteListItemButton"><ui5-button				id="${ifDefined(context._id)}-deleteSelectionElement"				design="Transparent"				icon="sap-icon://decline"				@ui5-press="${ifDefined(context._onDelete)}"			></ui5-button></div>	`; };

/**
 * @public
 */
const metadata$8 = {
	tag: "ui5-li",
	properties: /** @lends sap.ui.webcomponents.main.StandardListItem.prototype */ {

		/**
		 * Defines the description displayed right under the item text, if such is present.
		 * @type {string}
		 * @defaultvalue: ""
		 * @public
		 * @since 0.8.0
		 */
		description: {
			type: String,
		},

		/**
		 * Defines the <code>icon</code> source URI.
		 * </br></br>
		 * <b>Note:</b>
		 * SAP-icons font provides numerous buil-in icons. To find all the available icons, see the
		 * <ui5-link target="_blank" href="https://openui5.hana.ondemand.com/test-resources/sap/m/demokit/iconExplorer/webapp/index.html" class="api-table-content-cell-link">Icon Explorer</ui5-link>.
		 *
		 * @type {string}
		 * @public
		 */
		icon: {
			type: String,
		},

		/**
		 * Defines whether the <code>icon</code> should be displayed in the beginning of the list item or in the end.
		 * </br></br>
		 * <b>Note:</b> If <code>image</code> is set, the <code>icon</code> would be displayed after the <code>image</code>.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		iconEnd: {
			type: Boolean,
		},

		/**
		 * Defines the <code>image</code> source URI.
		 * </br></br>
		 * <b>Note:</b> The <code>image</code> would be displayed in the beginning of the list item.
		 *
		 * @type {string}
		 * @public
		 */
		image: {
			type: String,
		},

		/**
		 * Defines the <code>info</code>, displayed in the end of the list item.
		 * @type {string}
		 * @public
		 * @since 0.13.0
		 */
		info: {
			type: String,
		},

		/**
		 * Defines the state of the <code>info</code>.
		 * <br>
		 * Available options are: <code>"None"</code< (by default), <code>"Success"</code>, <code>"Warning"</code> and <code>"Erorr"</code>.
		 * @type {string}
		 * @public
		 * @since 0.13.0
		 */
		infoState: {
			type: ValueState,
			defaultValue: ValueState.None,
		},
	},
	slots: /** @lends sap.ui.webcomponents.main.StandardListItem.prototype */ {
		/**
		 * Defines the text of the <code>ui5-li</code>.
		 * <br><b>Note:</b> Аlthough this slot accepts HTML Elements, it is strongly recommended that you only use text in order to preserve the intended design.
		 *
		 * @type {Node[]}
		 * @slot
		 * @public
		 */
		"default": {
			type: Node,
		},
	},
};

/**
 * @class
 * The <code>ui5-li</code> represents the simplest type of item for a <code>ui5-list</code>.
 *
 * This is a list item,
 * providing the most common use cases such as <code>text</code>,
 * <code>image</code> and <code>icon</code>.
 *
 * @constructor
 * @author SAP SE
 * @alias sap.ui.webcomponents.main.StandardListItem
 * @extends ListItem
 * @tagname ui5-li
 * @public
 */
class StandardListItem extends ListItem {
	static get render() {
		return litRender;
	}

	static get template() {
		return block0$5;
	}

	static get styles() {
		return ListItem.styles;
	}

	static get metadata() {
		return metadata$8;
	}

	get displayImage() {
		return !!this.image;
	}

	get displayIconBegin() {
		return (this.icon && !this.iconEnd);
	}

	get displayIconEnd() {
		return (this.icon && this.iconEnd);
	}

	get classes() {
		const result = super.classes;
		const hasDesc = this.description && !!this.description.length;
		const hasTitle = this.textContent;
		const infoState = this.infoState.toLowerCase();

		// Modify main classes
		result.main.sapMSLIWithTitleAndDescription = hasDesc && hasTitle;

		// Add "info" classes
		result.info = {
			"sapMSLI-info": true,
			[`sapMSLI-info--${infoState}`]: true,
		};

		return result;
	}

	static async define(...params) {
		await Icon.define();

		super.define(...params);
	}
}

StandardListItem.define();

const ListSeparatorsTypes = {
	/**
	 * Separators between the items including the last and the first one.
	 * @public
	 */
	All: "All",
	/**
	 * Separators between the items.
	 * <b>Note:</b> This enumeration depends on the theme.
	 * @public
	 */
	Inner: "Inner",
	/**
	 * No item separators.
	 * @public
	 */
	None: "None",
};

class ListSeparators extends DataType {
	static isValid(value) {
		return !!ListSeparatorsTypes[value];
	}
}

ListSeparators.generataTypeAcessors(ListSeparatorsTypes);

const block0$6 = (context) => { return html`<div	class="${ifDefined(classMap(context.classes.main))}"	@focusin="${ifDefined(context.onfocusin)}"><!-- header -->	${ context.header.length ? block1$4() : undefined }${ context.shouldRenderH1 ? block2$2(context) : undefined }<div id="${ifDefined(context._id)}-before" tabindex="0" class="sapMListDummyArea"></div><ul id="${ifDefined(context._id)}-listUl" class="${ifDefined(classMap(context.classes.ul))}"><slot></slot>		${ context.showNoDataText ? block3$1(context) : undefined }</ul>	${ context.footerText ? block4$1(context) : undefined }<div id="${ifDefined(context._id)}-after" tabindex="0" class="sapMListDummyArea"></div></div>`; };
const block1$4 = (context) => { return html`<slot name="header" />	`; };
const block2$2 = (context) => { return html`<header id="${ifDefined(context._id)}-header" class="sapMListHdr sapMListHdrText">			${ifDefined(context.headerText)}</header>	`; };
const block3$1 = (context) => { return html`<li id="${ifDefined(context._id)}-nodata" class="${ifDefined(classMap(context.classes.noData))}" tabindex="${ifDefined(context.noDataTabIndex)}"><div id="${ifDefined(context._id)}-nodata-text" class="sapMListNoDataText">					${ifDefined(context.noDataText)}</div></li>		`; };
const block4$1 = (context) => { return html`<footer id="${ifDefined(context._id)}-footer" class="sapMListFtr">			${ifDefined(context.footerText)}</footer>	`; };

var listCss = ":host(ui5-list:not([hidden])){display:block;max-width:100%}ui5-list:not([hidden]){display:block;max-width:100%}.sapMList{width:100%;height:100%;position:relative;box-sizing:border-box}.sapMList.sapMListInsetBG{padding:2rem}.sapMList .sapMListUl{list-style-type:none;padding:0;margin:0}.sapMList .sapMListUl:focus{outline:none}.sapMList .sapMListDummyArea{position:fixed}.sapMList .sapMListNoData{list-style-type:none;display:-webkit-box;display:flex;-webkit-box-align:center;align-items:center;-webkit-box-pack:center;justify-content:center;color:var(--sapUiListTextColor,var(--sapUiBaseText,var(--sapTextColor,var(--sapPrimary6,#32363a))));background-color:var(--sapUiListBackground,var(--sapList_Background,var(--sapBaseColor,var(--sapPrimary3,#fff))));border-bottom:1px solid var(--sapUiListBorderColor,var(--sapList_BorderColor,#ededed));padding:0 1rem!important;height:3rem}.sapMList .sapMListHdrText{overflow:hidden;white-space:nowrap;text-overflow:ellipsis;box-sizing:border-box;font-size:var(--sapMFontHeader4Size,1.125rem);font-family:var(--sapUiFontHeaderFamily,var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif)));color:var(--sapUiGroupTitleTextColor,var(--sapGroup_TitleTextColor,#32363a));height:3rem;line-height:3rem;padding:0 1rem;background-color:var(--sapUiGroupTitleBackground,var(--sapGroup_TitleBackground,transparent));border-bottom:1px solid var(--sapUiGroupTitleBorderColor,var(--sapGroup_TitleBorderColor,#d9d9d9))}.sapMList .sapMListFtr{height:2rem;box-sizing:border-box;-webkit-text-size-adjust:none;font-size:var(--sapMFontMediumSize,.875rem);font-family:var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif));line-height:2rem;background-color:var(--sapUiListFooterBackground,#fafafa);color:var(--sapUiListFooterTextColor,var(--sapUiListTextColor,var(--sapUiBaseText,var(--sapTextColor,var(--sapPrimary6,#32363a)))));padding:0 1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sapMList .sapMListShowSeparatorsNone .sapMListNoData{border-bottom:0}.sapMList .sapMListNoDataText{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sapUiSizeCompact.sapMList .sapMListNoData{height:2rem;font-size:var(--sapMFontMediumSize,.875rem)}";

/**
 * @public
 */
const metadata$9 = {
	tag: "ui5-list",
	slots: /** @lends sap.ui.webcomponents.main.List.prototype */ {

		/**
		 * Defines the <code>ui5-li</code> header.
		 * <b>Note:</b> When <code>header</code> is set, the
		 * <code>headerText</code> property is ignored.
		 *
		 * @type {HTMLElement[]}
		 * @slot
		 * @public
		 */
		header: {
			type: HTMLElement,
		},

		/**
		 * Defines the items of the <code>ui5-list</code>.
		 * <br><b>Note:</b> Only <code>ui5-li</code>, <code>ui5-li-custom</code> and <code>ui5-li-groupheader</code> are allowed.
		 *
		 * @type {ListItemBase[]}
		 * @slot
		 * @public
		 */
		"default": {
			propertyName: "items",
			type: ListItemBase,
		},
	},
	properties: /** @lends  sap.ui.webcomponents.main.List.prototype */ {

		/**
		 * Defines the <code>ui5-list</code> header text.
		 * <br><br>
		 * <b>Note:</b> If <code>header</code> is set this property is ignored.
		 *
		 * @type {string}
		 * @defaultvalue: ""
		 * @public
		 */
		headerText: {
			type: String,
		},

		/**
		 * Defines the footer text.
		 *
		 * @type {string}
		 * @defaultvalue: ""
		 * @public
		 */
		footerText: {
			type: String,
		},

		/**
		 * Determines whether the list items are indented.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		inset: {
			type: Boolean,
		},

		/**
		 * Defines the mode of the <code>ui5-list</code>.
		 * <br><br>
		 * <b>Note:</b> Avalaible options are <code>None</code>, <code>SingleSelect</code>,
		 * <code>MultiSelect</code>, and <code>Delete</code>.
		 *
		 * @type {string}
		 * @defaultvalue "None"
		 * @public
		 */
		mode: {
			type: ListMode,
			defaultValue: ListMode.None,
		},

		/**
		 * Defines the text that is displayed when the <code>ui5-list</code> contains no items.
		 *
		 * @type {string}
		 * @defaultvalue: ""
		 * @public
		 */
		noDataText: {
			type: String,
		},

		/**
		 * Defines the item separator style that is used.
		 * <br><br>
		 * <b>Notes:</b>
		 * <ul>
		 * <li>Avalaible options are <code>All</code>, <code>Inner</code>, and <code>None</code>.</li>
		 * <li>When set to <code>None</code>, none of the items is separated by horizontal lines.</li>
		 * <li>When set to <code>Inner</code>, the first item doesn't have a top separator and the last
		 * item doesn't have a bottom separator.</li>
		 * </ul>
		 *
		 * @type {string}
		 * @defaultvalue "All"
		 * @public
		 */
		separators: {
			type: ListSeparators,
			defaultValue: ListSeparators.All,
		},
	},
	events: /** @lends  sap.ui.webcomponents.main.List.prototype */ {

		/**
		 * Fired when an item is activated, unless the item's <code>type</code> property
		 * is set to <code>Inactive</code>.
		 *
		 * @event
		 * @param {HTMLElement} item the clicked item.
		 * @public
		 */
		itemClick: {
			detail: {
				item: { type: HTMLElement },
			},
		},

		/**
		 * Fired when the Delete button of any item is pressed.
		 * <br><br>
		 * <b>Note:</b> A Delete button is displayed on each item,
		 * when the <code>ui5-list</code> <code>mode</code> property is set to <code>Delete</code>.
		 * @event
		 * @param {HTMLElement} item the deleted item.
		 * @public
		 */
		itemDelete: {
			detail: {
				item: { type: HTMLElement },
			},
		},

		/**
		 * Fired when selection is changed by user interaction
		 * in <code>SingleSelect</code> and <code>MultiSelect</code> modes.
		 *
		 * @event
		 * @param {Array} selectedItems an array of the selected items.
		 * @param {Array} previouslySelectedItems an array of the previously selected items.
		 * @public
		 */
		selectionChange: {
			detail: {
				selectedItems: { type: Array },
				previouslySelectedItems: { type: Array },
			},
		},
	},
};

/**
 * @class
 *
 * <h3 class="comment-api-title"> Overview </h3>
 *
 * The <code>ui5-list</code> component allows displaying a list of items, advanced keyboard
 * handling support for navigating between items, and predefined modes to improve the development efficiency.
 * <br><br>
 * The <code>ui5-list</code> is а container for the available list items:
 * <ul>
 * <li><code>ui5-li</code></li>
 * <li><code>ui5-li-custom</code></li>
 * <li><code>ui5-li-group-header</code></li>
 * </ul>
 * <br><br>
 * To benefit from the built-in selection mechanism, you can use the available
 * selection modes, such as
 * <code>SingleSelect</code>, <code>MultiSelect</code> and <code>Delete</code>.
 * <br><br>
 * Additionally, the <code>ui5-list</code> provides header, footer, and customization for the list item separators.
 *
 * <h3>ES6 Module Import</h3>
 *
 * <code>import "@ui5/webcomponents/dist/List";</code>
 * <br>
 * <code>import "@ui5/webcomponents/dist/StandardListItem";</code> (for <code>ui5-li</code>)
 * <br>
 * <code>import "@ui5/webcomponents/dist/CustomListItem";</code> (for <code>ui5-li-custom</code>)
 * <br>
 * <code>import "@ui5/webcomponents/dist/GroupHeaderListItem";</code> (for <code>ui5-li-group-header</code>)
 *
 * @constructor
 * @author SAP SE
 * @alias sap.ui.webcomponents.main.List
 * @extends UI5Element
 * @tagname ui5-list
 * @appenddocs StandardListItem CustomListItem GroupHeaderListItem
 * @public
 */
class List extends UI5Element {
	static get metadata() {
		return metadata$9;
	}

	static get render() {
		return litRender;
	}

	static get template() {
		return block0$6;
	}

	static get styles() {
		return listCss;
	}

	constructor() {
		super();
		this.initItemNavigation();

		// Stores the last focused item within the internal ul element.
		this._previouslyFocusedItem = null;

		// Indicates that the List is forwarding the focus before or after the internal ul.
		this._forwardingFocus = false;

		this._previouslySelectedItem = null;

		this.addEventListener("ui5-_press", this.onItemPress.bind(this));
		this.addEventListener("ui5-_focused", this.onItemFocused.bind(this));
		this.addEventListener("ui5-_forwardAfter", this.onForwardAfter.bind(this));
		this.addEventListener("ui5-_forwardBefore", this.onForwardBefore.bind(this));
		this.addEventListener("ui5-_selectionRequested", this.onSelectionRequested.bind(this));
	}

	onBeforeRendering() {
		this.prepareListItems();
		this._itemNavigation.init();
	}

	initItemNavigation() {
		this._itemNavigation = new ItemNavigation(this);
		this._itemNavigation.getItemsCallback = () => this.getSlottedNodes("items");

		this._delegates.push(this._itemNavigation);
	}

	prepareListItems() {
		const slottedItems = this.getSlottedNodes("items");

		slottedItems.forEach((item, key) => {
			const isLastChild = key === slottedItems.length - 1;
			const showBottomBorder = this.separators === ListSeparators.All
				|| (this.separators === ListSeparators.Inner && !isLastChild);

			item._mode = this.mode;
			item._hideBorder = !showBottomBorder;
		});

		this._previouslySelectedItem = null;
	}

	/*
	* ITEM SELECTION BASED ON THE CURRENT MODE
	*/
	onSelectionRequested(event) {
		const previouslySelectedItems = this.getSelectedItems();
		let selectionChange = false;
		this._selectionRequested = true;

		if (this[`handle${this.mode}`]) {
			selectionChange = this[`handle${this.mode}`](event.detail.item, event.selected);
		}

		if (selectionChange) {
			this.fireEvent("selectionChange", { selectedItems: this.getSelectedItems(), previouslySelectedItems });
		}
	}

	handleSingleSelect(item) {
		if (item.selected) {
			return false;
		}

		this.deselectSelectedItems();
		item.selected = true;

		return true;
	}

	handleSingleSelectBegin(item) {
		return this.handleSingleSelect(item);
	}

	handleSingleSelectEnd(item) {
		return this.handleSingleSelect(item);
	}

	handleMultiSelect(item, selected) {
		item.selected = selected;
		return true;
	}

	handleDelete(item) {
		this.fireEvent("itemDelete", { item });
	}

	deselectSelectedItems() {
		this.getSelectedItems().forEach(item => { item.selected = false; });
	}

	getSelectedItems() {
		return this.getSlottedNodes("items").filter(item => item.selected);
	}

	getFirstSelectedItem() {
		const slottedItems = this.getSlottedNodes("items");
		let firstSelectedItem = null;

		for (let i = 0; i < slottedItems.length; i++) {
			if (slottedItems[i].selected) {
				firstSelectedItem = slottedItems[i];
				break;
			}
		}

		return firstSelectedItem;
	}

	onkeydown(event) {
		if (isTabNext(event)) {
			this._handleTabNext(event);
		}
	}

	/*
	* KEYBOARD SUPPORT
	*/
	_handleTabNext(event) {
		// If forward navigation is performed, we check if the List has headerToolbar.
		// If yes - we check if the target is at the last tabbable element of the headerToolbar
		// to forward correctly the focus to the selected, previously focused or to the first list item.
		let lastTabbableEl;
		const target = this.getNormalizedTarget(event.target);

		if (this.headerToolbar) {
			lastTabbableEl = this.getHeaderToolbarLastTabbableElement();
		}

		if (!lastTabbableEl) {
			return;
		}

		if (lastTabbableEl === target) {
			if (this.getFirstSelectedItem()) {
				this.focusFirstSelectedItem();
			} else if (this.getPreviouslyFocusedItem()) {
				this.focusPreviouslyFocusedItem();
			} else {
				this.focusFirstItem();
			}

			event.stopImmediatePropagation();
			event.preventDefault();
		}
	}

	onfocusin(event) {
		// If the focusin event does not origin from one of the 'triggers' - ignore it.
		if (!this.isForwardElement(this.getNormalizedTarget(event.target))) {
			event.stopImmediatePropagation();
			return;
		}

		// The focus arrives in the List for the first time.
		// If there is selected item - focus it or focus the first item.
		if (!this.getPreviouslyFocusedItem()) {
			if (this.getFirstSelectedItem()) {
				this.focusFirstSelectedItem();
			} else {
				this.focusFirstItem();
			}

			event.stopImmediatePropagation();
			return;
		}

		// The focus returns to the List,
		// focus the first selected item or the previously focused element.
		if (!this.getForwardingFocus()) {
			if (this.getFirstSelectedItem()) {
				this.focusFirstSelectedItem();
			} else {
				this.focusPreviouslyFocusedItem();
			}
		}

		this.setForwardingFocus(false);
	}

	isForwardElement(node) {
		const nodeId = node.id;

		if (this._id === nodeId || this.getBeforeElement().id === nodeId) {
			return true;
		}

		return this.getAfterElement().id === nodeId;
	}

	onItemFocused(event) {
		const target = event.target;

		this._itemNavigation.update(target);
		this.fireEvent("itemFocused", { item: target });
	}

	onItemPress(event) {
		const pressedItem = event.detail.item;

		if (pressedItem.type === ListItemType.Active) {
			this.fireEvent("itemPress", { item: pressedItem });
			this.fireEvent("itemClick", { item: pressedItem });
		}

		if (!this._selectionRequested && this.mode !== ListMode.Delete) {
			this._selectionRequested = true;
			this.onSelectionRequested({
				detail: {
					item: pressedItem,
				},
				selected: !pressedItem.selected,
			});
		}

		this._selectionRequested = false;
	}

	onForwardBefore(event) {
		this.setPreviouslyFocusedItem(event.target);
		this.focusBeforeElement();
	}

	onForwardAfter(event) {
		this.setPreviouslyFocusedItem(event.target);
		this.focusAfterElement();
	}

	focusBeforeElement() {
		this.setForwardingFocus(true);
		this.getBeforeElement().focus();
	}

	focusAfterElement() {
		this.setForwardingFocus(true);
		this.getAfterElement().focus();
	}

	focusFirstItem() {
		const firstItem = this.getFirstItem();

		if (firstItem) {
			firstItem.focus();
		}
	}

	focusPreviouslyFocusedItem() {
		const previouslyFocusedItem = this.getPreviouslyFocusedItem();

		if (previouslyFocusedItem) {
			previouslyFocusedItem.focus();
		}
	}

	focusFirstSelectedItem() {
		const firstSelectedItem = this.getFirstSelectedItem();

		if (firstSelectedItem) {
			firstSelectedItem.focus();
		}
	}

	setForwardingFocus(forwardingFocus) {
		this._forwardingFocus = forwardingFocus;
	}

	getForwardingFocus() {
		return this._forwardingFocus;
	}

	setPreviouslyFocusedItem(item) {
		this._previouslyFocusedItem = item;
	}

	getPreviouslyFocusedItem() {
		return this._previouslyFocusedItem;
	}

	getFirstItem() {
		const slottedItems = this.getSlottedNodes("items");
		return !!slottedItems.length && slottedItems[0];
	}

	getAfterElement() {
		if (!this._afterElement) {
			this._afterElement = this.shadowRoot.querySelector(`#${this._id}-after`);
		}
		return this._afterElement;
	}

	getBeforeElement() {
		if (!this._beforeElement) {
			this._beforeElement = this.shadowRoot.querySelector(`#${this._id}-before`);
		}
		return this._beforeElement;
	}

	getHeaderToolbarLastTabbableElement() {
		return this.getLastTabbableELement(
			this.headerToolbar.getDomRef()
		) || this.headerToolbar.getDomRef();
	}

	getLastTabbableELement(node) {
		return FocusHelper.getLastTabbableElement(node);
	}

	getNormalizedTarget(target) {
		let focused = target;

		if (target.shadowRoot && target.shadowRoot.activeElement) {
			focused = target.shadowRoot.activeElement;
		}

		return focused;
	}

	get shouldRenderH1() {
		return !this.header.length && this.headerText;
	}

	get showNoDataText() {
		return this.items.length === 0 && this.noDataText;
	}

	get classes() {
		return {
			main: {
				sapMList: true,
				sapMListInsetBG: this.inset,
				sapUiSizeCompact: getCompactSize(),
			},
			ul: {
				sapMListItems: true,
				sapMListUl: true,
				[`sapMListShowSeparators${this.separators}`]: true,
				[`sapMListMode${this.mode}`]: true,
				sapMListInset: this.inset,
			},
			noData: {
				sapMLIB: true,
				sapMListNoData: true,
				sapMLIBTypeInactive: true,
				sapMLIBFocusable: isDesktop(),
			},
		};
	}
}

List.define();

const PopoverPlacementTypes = {
	/**
	 * Popover will be placed at the left side of the reference element.
	 * @public
	 */
	Left: "Left",
	/**
	 * Popover will be placed at the right side of the reference element.
	 * @public
	 */
	Right: "Right",
	/**
	 * Popover will be placed at the top of the reference element.
	 * @public
	 */
	Top: "Top",
	/**
	 * Popover will be placed at the bottom of the reference element.
	 * @public
	 */
	Bottom: "Bottom",
};

class PopoverPlacementType extends DataType {
	static isValid(value) {
		return !!PopoverPlacementTypes[value];
	}
}

PopoverPlacementType.generataTypeAcessors(PopoverPlacementTypes);

const PopoverVerticalAligns = {
	Center: "Center",
	Top: "Top",
	Bottom: "Bottom",
	Stretch: "Stretch",
};


class PopoverVerticalAlign extends DataType {
	static isValid(value) {
		return !!PopoverVerticalAligns[value];
	}
}

PopoverVerticalAlign.generataTypeAcessors(PopoverVerticalAligns);

const PopoverHorizontalAligns = {
	Center: "Center",
	Left: "Left",
	Right: "Right",
	Stretch: "Stretch",
};

class PopoverHorizontalAlign extends DataType {
	static isValid(value) {
		return !!PopoverHorizontalAligns[value];
	}
}

PopoverHorizontalAlign.generataTypeAcessors(PopoverHorizontalAligns);

var styles$2 = ".ui5-popup-wrapper-frame{width:0;height:0;display:none;visibility:visible}.ui5-popup-wrapper-frame--open{display:inline}.ui5-popup-wrapper{min-width:6.25rem;box-sizing:border-box;outline:none;max-width:100%;max-height:100%;background:var(--sapUiGroupContentBackground,var(--sapGroup_ContentBackground,var(--sapBaseColor,var(--sapPrimary3,#fff))));border:none;box-shadow:var(--sapUiShadowLevel2,0 .625rem 1.875rem 0 rgba(0,0,0,.15),0 0 0 1px rgba(0,0,0,.15));border-radius:.25rem;min-height:2rem}.ui5-popup-wrapper .ui5-popup-wrapper-header{margin:0;color:var(--sapUiPageHeaderTextColor,var(--sapPageHeader_TextColor,#32363a));font-size:1rem;font-weight:400;font-family:var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif));border-bottom:1px solid var(--sapUiPageFooterBorderColor,#d9d9d9)}.ui5-popup-wrapper .ui5-popup-wrapper-headerText{padding:0 .25rem;text-align:center;height:3rem;line-height:3rem}.ui5-popup-wrapper .ui5-popup-wrapper-footer{font-size:1rem;font-weight:400;font-family:var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif));background:var(--sapUiPageFooterBackground,var(--sapPageFooter_Background,var(--sapBaseColor,var(--sapPrimary3,#fff))));border-top:1px solid var(--sapUiPageFooterBorderColor,#d9d9d9);color:var(--sapUiPageFooterTextColor,var(--sapPageFooter_TextColor,#32363a))}.ui5-popup-wrapper .ui5-popup-wrapper-content{overflow:auto;position:relative;box-sizing:border-box;background-color:var(--sapUiGroupContentBackground,var(--sapGroup_ContentBackground,var(--sapBaseColor,var(--sapPrimary3,#fff))));border-radius:.25rem}.ui5-popup-wrapper .ui5-popup-wrapper-content,.ui5-popup-wrapper .ui5-popup-wrapper-footer{border-bottom-left-radius:.25rem;border-bottom-right-radius:.25rem}.ui5-popup-wrapper .ui5-popup-wrapper-scroll{vertical-align:middle;box-sizing:border-box;padding:var(--_ui5_popover_content_padding,.4375em)}.sapUiBLy{background-color:#000;opacity:.6;filter:alpha(opacity=60);top:0;left:0;right:0;bottom:0;position:fixed;outline:0 none}.ui5-popup-wrapper-blockLayer{visibility:visible}.ui5-popup-wrapper-blockLayer--hidden{display:none}";

/**
 * @public
 */
const metadata$a = {
	"abstract": true,
	slots: /** @lends  sap.ui.webcomponents.main.Popup.prototype */ {

		/**
		 * Defines the content of the Web Component.
		 * @type {Node[]}
		 * @slot
		 * @public
		 */
		"default": {
			type: Node,
		},

		/**
		 * Defines the header HTML Element.
		 *
		 * @type {HTMLElement[]}
		 * @slot
		 * @public
		 */
		header: {
			type: HTMLElement,
		},

		/**
		 * Defines the footer HTML Element.
		 *
		 * @type {HTMLElement[]}
		 * @slot
		 * @public
		 */
		footer: {
			type: HTMLElement,
		},
	},
	properties: /** @lends  sap.ui.webcomponents.main.Popup.prototype */ {
		/**
		 * Defines the ID of the HTML Element, which will get the initial focus.
		 *
		 * @type {string}
		 * @defaultvalue: ""
		 * @public
		 */
		initialFocus: {
			type: String,
			association: true,
		},

		/**
		 * Defines the header text.
		 * <br><b>Note:</b> If <code>header</code> slot is provided, the <code>headerText</code> is ignored.
		 *
		 * @type {string}
		 * @defaultvalue: ""
		 * @public
		 */
		headerText: {
			type: String,
		},

		_isOpen: {
			type: Boolean,
		},
		_zIndex: {
			type: Integer,
		},
		_hideBlockLayer: {
			type: Boolean,
		},
	},
	events: /** @lends  sap.ui.webcomponents.main.Popup.prototype */ {

		/**
		 * Fired before the component is opened.
		 *
		 * @public
		 * @event
		 */

		beforeOpen: {},
		/**
		 * Fired after the component is opened.
		 *
		 * @public
		 * @event
		 */

		afterOpen: {},
		/**
		 * Fired before the component is closed.
		 *
		 * @public
		 * @event
		 * @param {Boolean} escPressed Indicates that <code>ESC</code> key has triggered the event.
		 */

		beforeClose: {
			escPressed: { type: Boolean },
		},

		/**
		 * Fired after the component is closed.
		 *
		 * @public
		 * @event
		 */
		afterClose: {},
	},
};

const openedPopups = [];
let currentZIndex = 100;
let isBodyScrollingDisabled = false;
let customBLyBackStyleInserted = false;

function getParentHost(node) {
	while (node && !node.host) {
		node = node.parentNode;
	}

	return node && node.host;
}

function createBLyBackStyle() {
	if (customBLyBackStyleInserted) {
		return;
	}

	customBLyBackStyleInserted = true;

	const bodyStyleSheet = document.createElement("style");
	bodyStyleSheet.type = "text/css";
	bodyStyleSheet.innerHTML = `
		.sapUiBLyBack {
			width: 100%;
			height: 100%;
			position: fixed;
			overflow: hidden;
		}
	`;
	document.head.appendChild(bodyStyleSheet);
}

function updateBlockLayers() {
	let popup,
		i,
		hasModal = false;

	for (i = openedPopups.length - 1; i >= 0; i--) {
		popup = openedPopups[i];
		if (hasModal) {
			popup._hideBlockLayer = true;
		} else {
			if (popup.isModal()) { // eslint-disable-line
				popup._hideBlockLayer = false;
				hasModal = true;
			}
		}
	}

	updateBodyScrolling(hasModal);
}

function updateBodyScrolling(hasModal) {
	if (isBodyScrollingDisabled === hasModal) {
		return;
	}

	createBLyBackStyle();

	if (hasModal) {
		addBodyStyles();
	} else {
		removeBodyStyles();
	}
	isBodyScrollingDisabled = hasModal;
}

function addBodyStyles() {
	document.body.style.top = `-${window.pageYOffset}px`;
	document.body.classList.add("sapUiBLyBack");
}

function removeBodyStyles() {
	document.body.classList.remove("sapUiBLyBack");
	window.scrollTo(0, -parseFloat(document.body.style.top));
	document.body.style.top = "";
}

/**
 * @class
 * <h3 class="comment-api-title">Overview</h3>
 * Represents a base class for all popup Web Components.
 *
 * @constructor
 * @author SAP SE
 * @alias sap.ui.webcomponents.main.Popup
 * @extends sap.ui.webcomponents.base.UI5Element
 * @public
 */
class Popup extends UI5Element {
	static get metadata() {
		return metadata$a;
	}

	static get styles() {
		return styles$2;
	}

	static getNextZIndex() {
		currentZIndex += 2;
		return currentZIndex;
	}

	static hitTest(popup, event) {
		const indexOf = openedPopups.indexOf(popup);
		let openedPopup;

		for (let i = indexOf; i < openedPopups.length; i++) {
			openedPopup = openedPopups[i];
			if (openedPopup.hitTest(event)) {
				return true;
			}
		}

		return false;
	}

	static hasModalPopup() {
		for (let i = 0; i < openedPopups.length; i++) {
			if (openedPopups[i].isModal()) {
				return true;
			}
		}

		return false;
	}

	constructor() {
		super();

		this._documentKeyDownHandler = this.documentKeyDown.bind(this);
	}

	isTopPopup() {
		return openedPopups.indexOf(this) === openedPopups.length - 1;
	}

	isModal() {
		return true;
	}

	documentKeyDown(event) {
		if (isEscape(event) && this.isTopPopup()) {
			this.escPressed = true;
			this.close();
		}
	}

	getPopupDomRef() {
		const domRef = this.getDomRef();
		return domRef && domRef.querySelector(".ui5-popup-wrapper");
	}

	hitTest(_event) {
		return true;
	}

	open() {
		this.fireEvent("beforeOpen", { });

		this._isFirstTimeRendered = false;

		this._zIndex = Popup.getNextZIndex();
		openedPopups.push(this);

		updateBlockLayers();

		document.addEventListener("keydown", this._documentKeyDownHandler, true);
	}

	close() {
		this.fireEvent("beforeClose", {
			escPressed: this.escPressed,
		}, true);

		this.escPressed = false;

		document.removeEventListener("keydown", this._documentKeyDownHandler, true);

		const index = openedPopups.indexOf(this);
		openedPopups.splice(index, 1);

		updateBlockLayers();
	}

	initInitialFocus() {
		const initialFocus = this.initialFocus;
		let initialFocusDomRef = this.initialFocus;

		if (initialFocus && typeof initialFocus === "string") {
			initialFocusDomRef = document.getElementById(initialFocus);

			if (!initialFocusDomRef) {
				const parentHost = getParentHost(this);
				if (parentHost) {
					initialFocusDomRef = parentHost.shadowRoot.querySelector(`#${initialFocus}`);
				}
			}
		}

		this._initialFocusDomRef = initialFocusDomRef;
	}

	onFirstTimeAfterRendering() {
		if (this.isTopPopup()) {
			this.initInitialFocus();
			this.setInitialFocus(this.getPopupDomRef());
		}

		this.fireEvent("afterOpen", {});
	}

	onAfterRendering() {
		if (!this._isOpen) {
			return;
		}

		if (!this._isFirstTimeRendered) {
			this.onFirstTimeAfterRendering();
			this._isFirstTimeRendered = true;
		}
	}

	setInitialFocus(container) {
		if (this._initialFocusDomRef) {
			if (this._initialFocusDomRef !== document.activeElement) {
				this._initialFocusDomRef.focus();
			}
			return;
		}

		if (!container) {
			return;
		}

		const focusableElement = FocusHelper.findFirstFocusableElement(container);

		if (focusableElement) {
			focusableElement.focus();
		} else {
			container.focus();
		}
	}

	onfocusin(event) {
		this.preserveFocus(event, this.getPopupDomRef());
	}

	preserveFocus(event, container) {
		if (!this.isTopPopup()) {
			return;
		}

		let target = event.target;

		while (target.shadowRoot && target.shadowRoot.activeElement) {
			target = target.shadowRoot.activeElement;
		}

		let focusableElement;
		let isSpecialCase = false;

		switch (target.id) {
		case `${this._id}-firstfe`:
			focusableElement = FocusHelper.findLastFocusableElement(container);
			isSpecialCase = true;
			break;
		case `${this._id}-lastfe`:
			focusableElement = FocusHelper.findFirstFocusableElement(container);
			isSpecialCase = true;
			break;
		case `${this._id}-blocklayer`:
			focusableElement = this._currentFocusedElement
				|| FocusHelper.findFirstFocusableElement(container);
			isSpecialCase = true;
			break;
		}

		if (focusableElement) {
			focusableElement.focus();
		} else if (isSpecialCase) {
			container.focus();
		}

		this._currentFocusedElement = focusableElement || document.activeElement;
	}

	storeCurrentFocus() {
		let element = document.activeElement;

		while (element.shadowRoot && element.shadowRoot.activeElement) {
			element = element.shadowRoot.activeElement;
		}

		this._lastFocusableElement = element;
	}

	resetFocus() {
		if (!this._lastFocusableElement) {
			return;
		}

		const lastFocusableElement = this._lastFocusableElement;
		if (lastFocusableElement) {
			lastFocusableElement.focus();
		}

		this._lastFocusableElement = null;
	}

	onExitDOM() {
		removeBodyStyles();
	}

	get hasHeader() {
		return !!(this.headerText.length || this.header.length);
	}

	get hasFooter() {
		return !!this.footer.length;
	}

	get role() {
		return "heading";
	}
}

const block0$7 = (context) => { return html`<span class="${ifDefined(classMap(context.classes.frame))}" @focusin="${ifDefined(context.onfocusin)}"><span id="${ifDefined(context._id)}-firstfe" tabindex="0" @focusin=${ifDefined(context.focusHelper.forwardToLast)}></span><div style="${ifDefined(styleMap$1(context.styles.main))}" role="dialog" aria-labelledby="${ifDefined(context.headerId)}" tabindex="-1" class="${ifDefined(classMap(context.classes.main))}">			${ context.hasHeader ? block1$5(context) : undefined }<div id="${ifDefined(context._id)}-content" role="application" style="${ifDefined(styleMap$1(context.styles.content))}" class="ui5-popup-wrapper-content"><div class="ui5-popup-wrapper-scroll"><slot></slot></div></div>			${ context.hasFooter ? block4$2() : undefined }<span id="${ifDefined(context._id)}-arrow" style="${ifDefined(styleMap$1(context.styles.arrow))}" class="${ifDefined(classMap(context.classes.arrow))}"></span></div><span id="${ifDefined(context._id)}-lastfe" tabindex="0" @focusin=${ifDefined(context.focusHelper.forwardToFirst)}></span><div tabindex="0" id="${ifDefined(context._id)}-blocklayer" style="${ifDefined(styleMap$1(context.styles.blockLayer))}" class="${ifDefined(classMap(context.classes.blockLayer))}"></div></span>`; };
const block1$5 = (context) => { return html`<header>			${ context.header.length ? block2$3(context) : block3$2(context) }</header>	`; };
const block2$3 = (context) => { return html`<div role="${ifDefined(context.role)}" class="ui5-popup-wrapper-header"><slot name="header"></slot></div>			`; };
const block3$2 = (context) => { return html`<h2 role="${ifDefined(context.role)}" class="ui5-popup-wrapper-header ui5-popup-wrapper-headerText">${ifDefined(context.headerText)}</h2>			`; };
const block4$2 = (context) => { return html`<footer><div class="ui5-popup-wrapper-footer"><slot name="footer"></slot></div></footer>	`; };

var popoverCss = ".ui5-popover-wrapper{position:fixed;z-index:10}.ui5-popover-wrapper-arr{pointer-events:none;display:block;width:1rem;height:1rem;position:absolute;overflow:hidden}.ui5-popover-wrapper-arr:after{content:\" \";display:block;width:.7rem;height:.7rem;background-color:var(--sapUiGroupContentBackground,var(--sapGroup_ContentBackground,var(--sapBaseColor,var(--sapPrimary3,#fff))));transform:rotate(-45deg)}.ui5-popover-wrapper-arrUp{left:calc(50% - .5625rem);top:-.5rem;height:.5625rem}.ui5-popover-wrapper-arrUp:after{margin:.1875rem 0 0 .1875rem;box-shadow:-.375rem .375rem .75rem 0 var(--_ui5_popover_arrow_shadow_color,rgba(0,0,0,.3)),0 0 .125rem 0 var(--_ui5_popover_arrow_shadow_color,rgba(0,0,0,.3))}.ui5-popover-wrapper-arrRight{top:calc(50% - .5625rem);right:-.5625rem;width:.5625rem}.ui5-popover-wrapper-arrRight:after{margin:.1875rem 0 0 -.375rem;box-shadow:-.375rem -.375rem .75rem 0 var(--_ui5_popover_arrow_shadow_color,rgba(0,0,0,.3)),0 0 .125rem 0 var(--_ui5_popover_arrow_shadow_color,rgba(0,0,0,.3))}.ui5-popover-wrapper-arrDown{left:calc(50% - .5625rem);height:.5625rem}.ui5-popover-wrapper-arrDown:after{margin:-.375rem 0 0 .125rem;box-shadow:.375rem -.375rem .75rem 0 var(--_ui5_popover_arrow_shadow_color,rgba(0,0,0,.3)),0 0 .125rem 0 var(--_ui5_popover_arrow_shadow_color,rgba(0,0,0,.3))}.ui5-popover-wrapper-arrLeft{left:-.5625rem;top:calc(50% - .5625rem);width:.5625rem;height:1rem}.ui5-popover-wrapper-arrLeft:after{margin:.125rem 0 0 .25rem;box-shadow:.375rem .375rem .75rem 0 var(--_ui5_popover_arrow_shadow_color,rgba(0,0,0,.3)),0 0 .125rem 0 var(--_ui5_popover_arrow_shadow_color,rgba(0,0,0,.3))}.ui5-popover-wrapper-arr.ui5-popover-wrapper-arr--hidden{display:none}.ui5-popover-wrapper{transform:translateZ(0)}";

/**
 * @public
 */
const metadata$b = {
	tag: "ui5-popover",
	properties: /** @lends sap.ui.webcomponents.main.Popover.prototype */ {

		/**
		 * Determines on which side the <code>ui5-popover</code> is placed at.
		 *
		 * @type {PopoverPlacementType}
		 * @defaultvalue "Right"
		 * @public
		 */
		placementType: {
			type: PopoverPlacementType,
			defaultValue: PopoverPlacementType.Right,
		},

		/**
		 * Determines the horizontal alignment of the <code>ui5-popover</code>.
		 *
		 * @type {PopoverHorizontalAlign}
		 * @defaultvalue "Center"
		 * @public
		 */
		horizontalAlign: {
			type: PopoverHorizontalAlign,
			defaultValue: PopoverHorizontalAlign.Center,
		},

		/**
		 * Determines the vertical alignment of the <code>ui5-popover</code>.
		 *
		 * @type {PopoverVerticalAlign}
		 * @defaultvalue "Center"
		 * @public
		 */
		verticalAlign: {
			type: PopoverVerticalAlign,
			defaultValue: PopoverVerticalAlign.Center,
		},

		/**
		 * Defines whether the <code>ui5-popover</code> should close when
		 * clicking/tapping outside of the popover.
		 * If enabled, it blocks any interaction with the background.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		modal: {
			type: Boolean,
		},

		/**
		 * Determines whether the <code>ui5-popover</code> arrow is hidden.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		noArrow: {
			type: Boolean,
		},

		/**
		 * Determines whether the <code>ui5-popover</code> would close upon user scroll.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		stayOpenOnScroll: {
			type: Boolean,
		},

		/**
		 * Determines if there is no enough space, the <code>ui5-popover</code> can be placed
		 * over the target.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		allowTargetOverlap: {
			type: Boolean,
		},

		_left: {
			type: Integer,
		},
		_top: {
			type: Integer,
		},

		_width: {
			type: String,
		},
		_height: {
			type: String,
		},

		_maxContentHeight: {
			type: Integer,
		},

		_arrowTranslateX: {
			type: Integer,
			defaultValue: 0,
		},

		_arrowTranslateY: {
			type: Integer,
			defaultValue: 0,
		},
		_actualPlacementType: {
			type: PopoverPlacementType,
			defaultValue: PopoverPlacementType.Right,
		},
		_focusElementsHandlers: {
			type: Object,
		},
	},
};

const diffTolerance = 32;
const dockInterval = 200;
const arrowSize = 8;

/**
 * @class
 *
 * <h3 class="comment-api-title">Overview</h3>
 *
 * The <code>ui5-popover</code> component displays additional information for an object
 * in a compact way and without leaving the page.
 * The Popover can contain various UI elements, such as fields, tables, images, and charts.
 * It can also include actions in the footer.
 *
 * <h3>Structure</h3>
 *
 * The popover has three main areas:
 * <ul>
 * <li>Header (optional) - with a back button and a title</li>
 * <li>Content - holds all the Web Component</li>
 * <li>Footer (optional) - with additional action buttons</li>
 * </ul>
 *
 * <b>Note:</b> The <code>ui5-popover</code> is closed when the user clicks
 * or taps outside the popover
 * or selects an action within the popover. You can prevent this with the
 * <code>modal</code> property.
 *
 * <h3>ES6 Module Import</h3>
 *
 * <code>import "@ui5/webcomponents/dist/Popover";</code>
 *
 * @constructor
 * @author SAP SE
 * @alias sap.ui.webcomponents.main.Popover
 * @extends Popup
 * @tagname ui5-popover
 * @public
 */
class Popover extends Popup {
	static get metadata() {
		return metadata$b;
	}

	static get render() {
		return litRender;
	}

	static get template() {
		return block0$7;
	}

	static get styles() {
		return [Popup.styles, popoverCss];
	}

	constructor() {
		super();

		this._documentMouseDownHandler = this.documentMouseDown.bind(this);

		const that = this;

		this._focusElementsHandlers = {
			forwardToFirst: event => {
				const firstFocusable = FocusHelper.findFirstFocusableElement(that);

				if (firstFocusable) {
					firstFocusable.focus();
				}
			},
			forwardToLast: event => {
				const lastFocusable = FocusHelper.findLastFocusableElement(that);

				if (lastFocusable) {
					lastFocusable.focus();
				}
			},
		};
	}

	isModal() {
		return this.modal;
	}

	static isInRect(x, y, rect) {
		return x >= rect.left && x <= rect.right
			&& y >= rect.top && y <= rect.bottom;
	}

	static getClientRect(domRef) {
		const rect = domRef.getBoundingClientRect();
		const computedStyle = window.getComputedStyle(domRef);

		const offsetLeft = parseFloat(computedStyle.paddingLeft);
		const offsetRight = parseFloat(computedStyle.paddingRight);
		const offsetTop = parseFloat(computedStyle.paddingTop);
		const offsetBottom = parseFloat(computedStyle.paddingBottom);

		return {
			left: rect.left + offsetLeft,
			right: rect.right - offsetRight,
			top: rect.top + offsetTop,
			bottom: rect.bottom - offsetBottom,
			width: rect.width - offsetLeft - offsetRight,
			height: rect.height - offsetTop - offsetBottom,
		};
	}

	hitTest(event) {
		const domRef = this.getPopupDomRef();
		const rect = domRef.getBoundingClientRect();
		let x,
			y;

		if (event.touches) {
			const touch = event.touches[0];
			x = touch.clientX;
			y = touch.clientY;
		} else {
			x = event.clientX;
			y = event.clientY;
		}

		// don't close the popover if the "initial focus" is outside the popover
		// and the user click/touch on it
		if (this.initialFocus && this._initialFocusDomRef) {
			const initialFocusRect = this._initialFocusDomRef.getBoundingClientRect();
			if (Popover.isInRect(x, y, initialFocusRect)) {
				return true;
			}
		}

		if (this._targetElement) {
			const targetElementRect = this._targetElement.getBoundingClientRect();
			if (Popover.isInRect(x, y, targetElementRect)) {
				return true;
			}
		}

		return Popover.isInRect(x, y, rect);
	}

	documentMouseDown(event) {
		if (!this.modal && !Popup.hitTest(this, event)) {
			this.close();
		}
	}

	checkDocking() {
		if (!this.stayOpenOnScroll && this.hasTargetElementMoved()) {
			this.close();
		}

		const popoverDomRef = this.getPopupDomRef();

		const popoverSize = {
			width: popoverDomRef.offsetWidth,
			height: popoverDomRef.offsetHeight,
		};

		const targetRect = Popover.getClientRect(this._targetElement);

		this.setLocation(targetRect, popoverSize);
	}

	getVerticalLeft(targetRect, popoverSize) {
		let left;

		switch (this.horizontalAlign) {
		case PopoverHorizontalAlign.Center:
		case PopoverHorizontalAlign.Stretch:
			left = targetRect.left - (popoverSize.width - targetRect.width) / 2;
			break;
		case PopoverHorizontalAlign.Left:
			left = targetRect.left;
			break;
		case PopoverHorizontalAlign.Right:
			left = targetRect.right - popoverSize.width;
			break;
		}

		return left;
	}

	getHorizontalTop(targetRect, popoverSize) {
		let top;

		switch (this.verticalAlign) {
		case PopoverVerticalAlign.Center:
		case PopoverVerticalAlign.Stretch:
			top = targetRect.top - (popoverSize.height - targetRect.height) / 2;
			break;
		case PopoverVerticalAlign.Top:
			top = targetRect.top;
			break;
		case PopoverVerticalAlign.Bottom:
			top = targetRect.bottom - popoverSize.height;
			break;
		}

		return top;
	}

	getActualPlacementType(targetRect, popoverSize) {
		const placementType = this.placementType;
		let actualPlacementType = placementType;

		const clientWidth = document.documentElement.clientWidth;
		const clientHeight = document.documentElement.clientHeight;

		switch (placementType) {
		case PopoverPlacementType.Top:
			if (targetRect.top < popoverSize.height
				&& targetRect.top < clientHeight - targetRect.bottom) {
				actualPlacementType = PopoverPlacementType.Bottom;
			}
			break;
		case PopoverPlacementType.Bottom:
			if (clientHeight - targetRect.bottom < popoverSize.height
				&& clientHeight - targetRect.bottom < targetRect.top) {
				actualPlacementType = PopoverPlacementType.Top;
			}
			break;
		case PopoverPlacementType.Left:
			if (targetRect.left < popoverSize.width
				&& targetRect.left < clientWidth - targetRect.right) {
				actualPlacementType = PopoverPlacementType.Right;
			}
			break;
		case PopoverPlacementType.Right:
			if (clientWidth - targetRect.right < popoverSize.width
				&& clientWidth - targetRect.right < targetRect.left) {
				actualPlacementType = PopoverPlacementType.Left;
			}
			break;
		}

		this._actualPlacementType = actualPlacementType;

		return actualPlacementType;
	}

	setLocation(targetRect, popoverSize) {
		let left = 0;
		let top = 0;
		const allowTargetOverlap = this.allowTargetOverlap;

		const clientWidth = document.documentElement.clientWidth;
		const clientHeight = document.documentElement.clientHeight;

		let maxHeight = clientHeight;

		let width = "";
		let height = "";

		const placementType = this.getActualPlacementType(targetRect, popoverSize);

		const isVertical = placementType === PopoverPlacementType.Top
			|| placementType === PopoverPlacementType.Bottom;

		if (this.horizontalAlign === PopoverHorizontalAlign.Stretch && isVertical) {
			popoverSize.width = targetRect.width;
			width = `${targetRect.width}px`;
		} else if (this.verticalAlign === PopoverVerticalAlign.Stretch && !isVertical) {
			popoverSize.height = targetRect.height;
			height = `${targetRect.height}px`;
		}

		this._width = width;
		this._height = height;

		const arrowOffset = this.noArrow ? 0 : arrowSize;

		// calc popover positions
		switch (placementType) {
		case PopoverPlacementType.Top:
			left = this.getVerticalLeft(targetRect, popoverSize);
			top = Math.max(targetRect.top - popoverSize.height - arrowOffset, 0);

			if (!allowTargetOverlap) {
				maxHeight = targetRect.top - arrowOffset;
			}
			break;
		case PopoverPlacementType.Bottom:
			left = this.getVerticalLeft(targetRect, popoverSize);

			if (allowTargetOverlap) {
				top = Math.max(Math.min(targetRect.bottom + arrowOffset, clientHeight - popoverSize.height), 0);
			} else {
				top = targetRect.bottom + arrowOffset;
				maxHeight = clientHeight - targetRect.bottom - arrowOffset;
			}
			break;
		case PopoverPlacementType.Left:
			left = Math.max(targetRect.left - popoverSize.width - arrowOffset, 0);
			top = this.getHorizontalTop(targetRect, popoverSize);
			break;
		case PopoverPlacementType.Right:
			if (allowTargetOverlap) {
				left = Math.max(Math.min(targetRect.left + targetRect.width + arrowOffset, clientWidth - popoverSize.width), 0);
			} else {
				left = targetRect.left + targetRect.width + arrowOffset;
			}

			top = this.getHorizontalTop(targetRect, popoverSize);
			break;
		}

		// correct popover positions
		if (isVertical) {
			if (popoverSize.width > clientWidth || left < 0) {
				left = 0;
			} else if (left + popoverSize.width > clientWidth) {
				left -= left + popoverSize.width - clientWidth;
			}
		} else {
			if (popoverSize.height > clientHeight || top < 0) { // eslint-disable-line
				top = 0;
			} else if (top + popoverSize.height > clientHeight) {
				top -= top + popoverSize.height - clientHeight;
			}
		}

		let maxContentHeight = Math.round(maxHeight);

		if (this.hasHeader) {
			const headerDomRef = this.getPopupDomRef().querySelector(".ui5-popup-wrapper-header");
			if (headerDomRef) {
				maxContentHeight = Math.round(maxHeight - headerDomRef.offsetHeight);
			}
		}

		this._maxContentHeight = maxContentHeight;

		const arrowTranslateX = isVertical
			? targetRect.left + targetRect.width / 2 - left - popoverSize.width / 2 : 0;
		const arrowTranslateY = !isVertical
			? targetRect.top + targetRect.height / 2 - top - popoverSize.height / 2 : 0;

		this._arrowTranslateX = Math.round(arrowTranslateX);
		this._arrowTranslateY = Math.round(arrowTranslateY);

		if (this._left === undefined || Math.abs(this._left - left) > 1.5) {
			this._left = Math.round(left);
		}

		if (this._top === undefined || Math.abs(this._top - top) > 1.5) {
			this._top = Math.round(top);
		}
	}

	/**
	 * Opens the <code>Popover</code>.
	 * @param {object} control This is the component to which the
	 * <code>ui5-popover</code> will be placed.
	 * The side of the placement depends on the <code>placementType</code> property
	 * set in the <code>ui5-popover</code>.
	 * @public
	 */
	openBy(element) {
		if (this._isOpen) {
			return;
		}

		const cancelled = super.open();
		if (cancelled) {
			return true;
		}

		this.storeCurrentFocus();

		const targetDomRef = element;

		const popoverSize = this.getPopoverSize();
		const targetRect = Popover.getClientRect(targetDomRef);

		this._targetElement = targetDomRef;
		this._targetRect = targetRect;

		this.setLocation(targetRect, popoverSize);

		this._isOpen = true;

		setTimeout(_ => {
			if (this._isOpen) {
				this._dockInterval = setInterval(this.checkDocking.bind(this), dockInterval);
			}
		}, 0);

		setTimeout(_ => {
			if (this._isOpen) {
				document.addEventListener("mousedown", this._documentMouseDownHandler, true);
				document.addEventListener("touchstart", this._documentMouseDownHandler, true);
			}
		}, 0);
	}

	/**
	 * Closes the <code>ui5-popover</code>.
	 * @public
	 */
	close() {
		if (!this._isOpen) {
			return;
		}

		const cancelled = super.close();
		if (cancelled) {
			return;
		}

		this._isOpen = false;

		clearInterval(this._dockInterval);

		document.removeEventListener("mousedown", this._documentMouseDownHandler, true);
		document.removeEventListener("touchstart", this._documentMouseDownHandler, true);

		this.resetFocus();

		RenderScheduler.whenFinished()
			.then(_ => {
				this.fireEvent("afterClose", {});
			});
	}

	getPopoverSize() {
		const popoverFrameDomRef = this.shadowRoot.querySelector(".ui5-popup-wrapper-frame"); // this.getDomRef();
		const popoverDomRef = popoverFrameDomRef.querySelector(".ui5-popover-wrapper");

		popoverFrameDomRef.style.visibility = "hidden";
		popoverFrameDomRef.style.display = "block";

		const width = popoverDomRef.offsetWidth;
		const height = popoverDomRef.offsetHeight;

		popoverFrameDomRef.style.display = "";
		popoverFrameDomRef.style.visibility = "visible";

		return {
			width,
			height,
		};
	}

	hasTargetElementMoved() {
		const newRect = this._targetElement.getBoundingClientRect();
		const targetRect = this._targetRect;

		return Math.abs(newRect.left - targetRect.left) > diffTolerance
			|| Math.abs(newRect.top - targetRect.top) > diffTolerance;
	}

	get classes() {
		const placementType = this._actualPlacementType;

		return {
			frame: {
				"ui5-popup-wrapper-frame": true,
				"ui5-popup-wrapper-frame--open": this._isOpen,
			},
			main: {
				"ui5-popup-wrapper": true,
				"ui5-popover-wrapper": true,
			},
			blockLayer: {
				sapUiBLy: true,
				"ui5-popup-wrapper-blockLayer": true,
				"ui5-popup-wrapper-blockLayer--hidden": !this.modal || this._hideBlockLayer,
			},
			arrow: {
				"ui5-popover-wrapper-arr": true,
				"ui5-popover-wrapper-arr--hidden": this.noArrow,
				"ui5-popover-wrapper-arrLeft": placementType === PopoverPlacementType.Right,
				"ui5-popover-wrapper-arrRight": placementType === PopoverPlacementType.Left,
				"ui5-popover-wrapper-arrUp": placementType === PopoverPlacementType.Bottom,
				"ui5-popover-wrapper-arrDown": placementType === PopoverPlacementType.Top,
			},
		};
	}

	get styles() {
		return {
			main: {
				left: `${this._left}px`,
				top: `${this._top}px`,
				width: this._width,
				height: this._height,
				"z-index": this._zIndex + 1,
			},
			content: {
				"max-height": `${this._maxContentHeight}px`,
			},
			arrow: {
				transform: `translate(${this._arrowTranslateX}px, ${this._arrowTranslateY}px)`,
			},
			blockLayer: {
				"z-index": this._zIndex,
			},
		};
	}

	get headerId() {
		return this.hasHeader ? `${this._id}-header` : undefined;
	}

	get focusHelper() {
		return {
			forwardToLast: this._focusElementsHandlers.forwardToLast,
			forwardToFirst: this._focusElementsHandlers.forwardToFirst,
		};
	}

	get role() {
		return "toolbar";
	}
}

Popover.define();

const block0$8 = (context) => { return html`<div	class="${ifDefined(classMap(context.classes.wrapper))}"	dir="${ifDefined(context.rtl)}"><div class="${ifDefined(classMap(context.classes.leftContainer))}">		${ context.icon.length ? block1$6() : undefined }${ !context.interactiveLogo ? block2$4(context) : undefined }${ context.showArrowDown ? block3$3(context) : undefined }<ui5-popover class="sapWCShellBarMenuPopover" placement-type="Bottom"><ui5-list separators="None" mode="SingleSelect" @ui5-itemPress=${ifDefined(context._menuItemPress)}><slot name="menuItems"></slot></ui5-list></ui5-popover><h2 class="${ifDefined(classMap(context.classes.secondaryTitle))}">${ifDefined(context.secondaryTitle)}</h2></div><div class="sapWCShellBarOverflowContainer sapWCShellBarOverflowContainerMiddle">		${ context.showCoPilot ? block6$1(context) : block7$1() }</div><div class="sapWCShellBarOverflowContainer sapWCShellBarOverflowContainerRight"><div class="sapWCShellBarOverflowContainerRightChild">			${ repeat(context._itemsInfo, undefined, (item, index) => block8$1(item, index, context)) }</div></div><ui5-popover class="sapWCShellBarOverflowPopover" placement-type="Bottom" horizontal-align="${ifDefined(context.popoverHorizontalAlign)}" no-arrow><ui5-list separators="None" @ui5-itemPress="${ifDefined(context._actionList.itemPress)}">			${ repeat(context._hiddenIcons, undefined, (item, index) => block11$1(item)) }</ui5-list></ui5-popover><div class="${ifDefined(classMap(context.classes.blockLayer))}"></div><div id="${ifDefined(context._id)}-searchfield-wrapper"		class="${ifDefined(classMap(context.classes.searchField))}"		style="${ifDefined(styleMap$1(context.styles.searchField))}"		@focusout=${ifDefined(context._searchField.focusout)}	>		${ context.searchField.length ? block12$1() : undefined }</div></div>`; };
const block1$6 = (context) => { return html`<slot name="icon"></slot>		`; };
const block2$4 = (context) => { return html`<img class="${ifDefined(classMap(context.classes.logo))}" src="${ifDefined(context.logo)}" @click="${ifDefined(context._logoPress)}" />		`; };
const block3$3 = (context) => { return html`<button tabindex="0" class="${ifDefined(classMap(context.classes.button))}" @click="${ifDefined(context._header.press)}">				${ context.interactiveLogo ? block4$3(context) : undefined }${ context.primaryTitle ? block5$1(context) : undefined }<span class="${ifDefined(classMap(context.classes.arrow))}"></span></button>		`; };
const block4$3 = (context) => { return html`<img class="${ifDefined(classMap(context.classes.logo))}" src="${ifDefined(context.logo)}" />				`; };
const block5$1 = (context) => { return html`<h1 class="${ifDefined(classMap(context.classes.buttonTitle))}"><bdi class="${ifDefined(classMap(context.classes.title))}">${ifDefined(context.primaryTitle)}</bdi></h1>				`; };
const block6$1 = (context) => { return html`<svg @click="${ifDefined(context._coPilotPress)}" version="1.1" width="44" height="44" viewBox="-150 -150 300 300" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"		style="background-color: transparent; cursor: pointer;" class="ui5-shellbar-coPilot"><defs><linearGradient id="grad1" x1="0%" x2="100%" y1="100%" y2="0%"><stop offset="0%" style="stop-color:#C0D9F2;stop-opacity:0.87"></stop><stop offset="80%" style="stop-color:#FFFFFF;stop-opacity:0.87"></stop></linearGradient><linearGradient id="grad2" x1="0%" x2="100%" y1="100%" y2="0%"><stop offset="0%" style="stop-color:rgb(180,210,255);stop-opacity:0.16"></stop><stop offset="80%" style="stop-color:#FFFFFF;stop-opacity:0.16"></stop></linearGradient><linearGradient id="grad3" x1="0%" x2="100%" y1="100%" y2="0%"><stop offset="0%" style="stop-color:rgb(180,210,255);stop-opacity:0.1"></stop><stop offset="80%" style="stop-color:#FFFFFF;stop-opacity:0.1"></stop></linearGradient></defs><g fill="url(#grad3)" transform="rotate(54)"><path id="c3" d="M 98.1584 0 C 98.3156 17.3952 89.0511 31.3348 79.5494 45.9279 C 70.339 60.0814 60.6163 71.2177 46.1724 79.9729 C 31.4266 88.9178 17.2493 94.3909 5.77261e-15 94.2739 C -17.1547 94.1581 -30.8225 87.6907 -45.7979 79.3244 C -61.0143 70.8266 -73.5583 62.554 -83.0507 47.9493 C -92.6677 33.1579 -98.4872 17.5705 -97.1793 1.19010e-14 C -95.9465 -16.9777 -84.488 -29.0862 -76.1351 -43.9566 C -67.6795 -59.0155 -63.8629 -76.1085 -49.262 -85.3243 C -34.502 -94.6464 -17.4328 -93.0037 -1.69174e-14 -92.0939 C 16.8967 -91.214 31.8608 -89.0341 46.4198 -80.4014 C 60.872 -71.8326 69.6003 -59.5351 78.6792 -45.4254 C 88.0511 -30.9104 98.015 -17.2766 98.1584 0 Z"				transform="rotate(244.811)"><animate id="wave3" attributeName="d" values="M 102 0 C 102 17.85951467281289, 86.87204367700592 29.533206594083104, 77.94228634059948 44.99999999999999 C 69.01252900419304 60.46679340591688, 66.4667934059169 79.40483384960629, 51.000000000000014 88.33459118601273 C 35.53320659408312 97.26434852241918, 17.859514672812903 90, 5.5109105961630896e-15 90 C -17.85951467281288 90, -35.53320659408308 97.26434852241918, -50.99999999999998 88.33459118601274 C -66.46679340591687 79.4048338496063, -69.01252900419303 60.46679340591692, -77.94228634059947 45.00000000000003 C -86.87204367700592 29.533206594083133, -102 17.859514672812914, -102 1.2491397351303002e-14 C -102 -17.85951467281287, -86.87204367700593 -29.533206594083083, -77.9422863405995 -44.99999999999997 C -69.01252900419306 -60.46679340591687, -66.46679340591693 -79.40483384960628, -51.00000000000004 -88.33459118601273 C -35.53320659408315 -97.26434852241918, -17.85951467281292 -89.99999999999999, -1.6532731788489267e-14 -90 C 17.859514672812853 -90.00000000000001, 35.533206594083055 -97.26434852241921, 50.99999999999993 -88.33459118601279 C 66.46679340591683 -79.40483384960635, 69.012529004193 -60.46679340591694, 77.94228634059945 -45.00000000000004 C 86.8720436770059 -29.53320659408314, 102 -17.85951467281291, 102 0 z ;M 104 0 C 103.6860370504768 18.670459122547623, 99.74513350853894 36.21879096669579, 88.33459118601274 50.99999999999999 C 77.42609021132327 65.13086500091876, 59.95986915829964 68.15050131663435, 44.50000000000001 77.07626093681503 C 29.040130841700375 86.00202055699572, 17.851519240361377 102, 6.245698675651501e-15 102 C -17.851519240361355 102, -28.89224164002164 85.74082198544978, -44.49999999999998 77.07626093681505 C -60.41578578366853 68.24070016127133, -78.942855942454 66.40974514759691, -90.0666419935816 52.000000000000036 C -101.58041073743591 37.08507152827802, -106.51375198961607 18.673591324066255, -104 1.2736326711132473e-14 C -101.57139126725896 -18.041098385442222, -86.17817517682458 -28.73502209016882, -77.07626093681506 -44.49999999999998 C -67.97434669680554 -60.264977909831146, -66.77256915682678 -79.42941623510848, -52.00000000000004 -90.0666419935816 C -36.96347614018194 -100.89393257665785, -18.33904556278876 -102.64701322308922, -1.8369701987210297e-14 -100 C 17.32727177622791 -97.49902374391826, 28.55026288749344 -84.4439984999364, 43.99999999999994 -76.21023553303064 C 60.07413421086994 -67.64370718198207, 78.79942390068253 -66.31128907769772, 90.06664199358158 -52.00000000000004 C 101.7221231317663 -37.19555062013585, 104.31680324149117 -18.83936298577321, 104 0 z ;M 102 0 C 101.82727211782054 17.85068357984393, 86.53189445508919 29.35841045474146, 77.07626093681505 44.49999999999999 C 67.96000753916402 59.09812997944896, 63.13859410212405 75.0566405949403, 49.000000000000014 84.87048957087498 C 34.41435518048109 94.99464438014832, 17.754300288879765 97.84390177587221, 6.000769315822031e-15 98 C -17.848085350949756 98.1569227951557, -34.936562555189376 96.05567507853976, -49.49999999999998 85.73651497465943 C -63.65084226105117 75.70970588855481, -67.15343120157955 58.79045409878119, -76.21023553303058 44.00000000000003 C -85.53194873850353 28.77692945084744, -101.82533168325062 17.849529545864502, -102 1.2491397351303002e-14 C -102.17467942383016 -17.85066458952948, -86.26579096020939 -29.195449136347488, -77.07626093681506 -44.49999999999998 C -68.05733453379239 -59.52042188438431, -65.25784853671414 -77.99137523784161, -50.00000000000004 -86.60254037844385 C -34.75370973790514 -95.20718230502631, -17.506833792572294 -87.99999999999999, -1.6165337748745062e-14 -88 C 17.50683379257223 -88.00000000000001, 34.671187347637854 -95.05929697358921, 49.999999999999936 -86.6025403784439 C 65.35816177516672 -78.12959215818911, 68.91293714727685 -60.037780348188306, 77.94228634059945 -45.00000000000004 C 87.13593221909689 -29.68859445350606, 102.172805244453 -17.858678638015444, 102 0 z ;M 88 0 C 87.0071643812453 16.750584310000846, 89.16591640357322 32.23066622251636, 82.48891971046778 47.62499999999999 C 75.39770857425334 63.9743373046321, 66.1406553264614 78.9687582413302, 50.250000000000014 87.03555308033607 C 34.54865539228622 95.00624548067042, 17.590620651271553 90.29638240436964, 5.480294426184406e-15 89.5 C -16.847968824431476 88.7372397661719, -32.382980242828936 89.6818280646011, -47.689999999999976 82.60150301295975 C -63.74959324223292 75.1730719952966, -77.27142977762603 65.04430269303984, -86.06560462809749 49.69000000000003 C -94.84784120247872 34.35654109365306, -96.67880542645688 17.590459164590612, -95 1.1634144591899855e-14 C -93.40474991806319 -16.714969454704665, -85.83878040009859 -30.176827189787602, -77.07626093681506 -44.49999999999998 C -68.48875537139932 -58.53709592172691, -59.78684881708811 -70.71810123462024, -46.12500000000004 -79.89084349911445 C -31.90399782177102 -89.43900857326942, -17.117492172090376 -95.6208569519316, -1.7680838162689912e-14 -96.25 C 17.42616675853088 -96.89048819537281, 32.604872069000194 -91.30523706046031, 48.124999999999936 -83.35494511425226 C 64.20208148728074 -75.11934989009448, 80.53937872975759 -67.29516003624032, 88.33459118601272 -51.00000000000004 C 96.03774549832913 -34.897278873736724, 89.0561690198359 -17.81911111787299, 88 0 z ;M 97 0 C 95.96205478306072 17.380245680862355, 92.31438589595038 33.26885450645463, 82.33303513778658 47.53499999999999 C 72.73454993850302 61.25392338906356, 58.07526843673644 67.1203245271079, 43.85500000000001 75.95908816593311 C 29.1689379616367 85.08737092091096, 17.266933647153582 97.78319544979668, 6.0442442771917615e-15 98.71 C -17.46539769433808 99.64745712962134, -31.760081272699992 89.97780532702197, -46.659999999999975 80.81749068116382 C -61.254519580560164 71.8449322457867, -74.9987279481924 63.057416617025154, -82.80068885583016 47.80500000000003 C -90.46529056195176 32.82111328110031, -87.3041822839497 16.816028610356618, -88 1.0776891832496709e-14 C -88.72578785785936 -17.54032572221827, -95.38715406508265 -34.80323520486043, -86.85368774554138 -50.144999999999975 C -78.30929038357452 -65.50641700627851, -59.99419319499677 -68.75787837688742, -44.82000000000004 -77.63051719523706 C -29.55758597966676 -86.55474040488905, -17.677948608071002 -101.20050810368325, -1.8540540215691355e-14 -100.93 C 17.66220221833233 -100.65973284769198, 28.66762264672243 -84.98120430879537, 44.03499999999994 -76.27085731129554 C 59.54270404931096 -67.48097206941182, 78.04582993349926 -65.57146684415069, 88.2133476294829 -50.93000000000004 C 98.53103081570782 -36.07229128519377, 98.0783410651801 -18.056668439457074, 97 0 z ;M 97 0 C 95.96205478306072 17.380245680862355, 92.31438589595038 33.26885450645463, 82.33303513778658 47.53499999999999 C 72.73454993850302 61.25392338906356, 58.07526843673644 67.1203245271079, 43.85500000000001 75.95908816593311 C 29.1689379616367 85.08737092091096, 17.266933647153582 97.78319544979668, 6.0442442771917615e-15 98.71 C -17.46539769433808 99.64745712962134, -31.760081272699992 89.97780532702197, -46.659999999999975 80.81749068116382 C -61.254519580560164 71.8449322457867, -74.9987279481924 63.057416617025154, -82.80068885583016 47.80500000000003 C -90.46529056195176 32.82111328110031, -87.3041822839497 16.816028610356618, -88 1.0776891832496709e-14 C -88.72578785785936 -17.54032572221827, -95.38715406508265 -34.80323520486043, -86.85368774554138 -50.144999999999975 C -78.30929038357452 -65.50641700627851, -59.99419319499677 -68.75787837688742, -44.82000000000004 -77.63051719523706 C -29.55758597966676 -86.55474040488905, -17.677948608071002 -101.20050810368325, -1.8540540215691355e-14 -100.93 C 17.66220221833233 -100.65973284769198, 28.66762264672243 -84.98120430879537, 44.03499999999994 -76.27085731129554 C 59.54270404931096 -67.48097206941182, 78.04582993349926 -65.57146684415069, 88.2133476294829 -50.93000000000004 C 98.53103081570782 -36.07229128519377, 98.0783410651801 -18.056668439457074, 97 0 z ;M 87.83 0 C 87.5551104106254 17.484718516847604, 95.16127715466017 34.74963105642935, 86.50727758402758 49.94499999999999 C 77.84990328247498 65.14629455992826, 59.80875022938145 68.6539166070951, 44.21500000000001 76.5826264566579 C 29.396758375489803 84.11702559690347, 16.533901742833184 92.20444258129785, 5.7515536921955445e-15 93.93 C -17.56198148944071 95.76285276019921, -35.17832492952776 96.1755728839107, -49.88499999999998 86.40335453557344 C -64.42964616977311 76.73880034577543, -67.07555683863683 58.889186090717956, -75.63865876653286 43.67000000000003 C -84.09849199523896 28.63435318786967, -98.51711635059414 17.25222189595266, -98.5 1.206277097160143e-14 C -98.48288504887265 -17.250811320073485, -84.34877504334715 -28.780575409619935, -75.55205622615443 -43.619999999999976 C -66.86093647073717 -58.281286656612146, -63.230342222349634 -75.4345590754149, -48.600000000000044 -84.17766924784742 C -33.93357389700559 -92.94234319091034, -17.025973616417954 -90.19821090033776, -1.630678445404658e-14 -88.77 C 15.977895940302826 -87.42970630164737, 29.38189187799461 -82.73892939223205, 44.10999999999994 -76.40076112186321 C 60.461233804495656 -69.36408876567695, 79.25079249329674 -66.31020434586661, 88.09210407295308 -50.86000000000004 C 96.93350510099964 -35.40963934294652, 88.10983120877545 -17.799036801646473, 87.83 0 z ;M 102.87 0 C 100.60412172987674 17.8655933362356, 85.53754352796288 28.604858280384207, 75.95908816593312 43.855 C 66.77647829932806 58.47490441348097, 64.20185353081875 76.67202079060546, 49.27000000000002 85.33814328891859 C 34.33463676216738 94.00630274472348, 17.255471196681203 88.61139941746183, 5.384771975850912e-15 87.94 C -16.62338090404565 87.29319481409648, -32.13105073147386 88.83642498642243, -47.104999999999976 81.58825329053197 C -62.593549158874595 74.0909884333756, -75.11183789801551 63.203277636192524, -82.85265038005723 47.83500000000003 C -90.43100426068291 32.78926071449635, -88.33481436911549 16.845994873358578, -88.2 1.0801384768479656e-14 C -88.0661541958799 -16.72496592774988, -90.31714156576788 -32.8325291006581, -82.09054802472696 -47.394999999999975 C -73.84119732253154 -61.99775494831187, -58.70114242558277 -68.16576009477593, -44.58000000000004 -77.21482500142054 C -29.826455382596357 -86.66914383925732, -17.522369834392396 -100.13333736150332, -1.8369701987210297e-14 -100 C 17.510547309053553 -99.86675260260256, 28.908254552710822 -85.0894876419882, 44.18999999999994 -76.53932518646872 C 59.70239533946346 -67.86011372570036, 77.14713304516553 -64.89164530763992, 87.9622002623854 -50.78500000000004 C 99.23322575875696 -36.08362498889298, 105.20080735972847 -18.37753465535834, 102.87 0 z ;M 96.65 0 C 97.5682370155223 17.290645042626103, 91.44243921640975 32.85986013368205, 81.65753532283473 47.144999999999996 C 72.23761953500264 60.89728781209352, 58.31868393027413 67.69602416070182, 44.205000000000005 76.5653059485822 C 29.586348647997518 85.75191795153148, 17.265486227503665 98.5023411385901, 6.0289361922024196e-15 98.46 C -17.260135494401737 98.41767198331847, -28.927850358240754 84.61477988915865, -44.07999999999998 76.34879959763612 C -59.63539109726837 67.86283824713713, -77.60369551546168 65.19715075831209, -87.6850721331744 50.625000000000036 C -97.93164740539275 35.81406243807856, -99.13895928925051 17.870177323503324, -96.9 1.1866827483737853e-14 C -94.78582581853146 -16.874209235069404, -84.03526438034655 -28.885451186299278, -75.855165117479 -43.79499999999998 C -67.48656343152348 -59.04812484966506, -64.58702634493868 -77.07802892327148, -49.685000000000045 -86.05694437405965 C -34.754341245902474 -95.05311170556791, -17.423866102474058 -90.01428351214383, -1.6440883278553216e-14 -89.5 C 16.944874403202444 -88.99985442555268, 33.406945286813375 -91.76595741651028, 48.01999999999994 -83.17307977945752 C 62.60280079933599 -74.59799227491723, 68.26035047536544 -58.944088507890214, 76.799132807604 -44.340000000000046 C 85.38138197865302 -29.66156909334073, 95.74829471964232 -16.979348111836277, 96.65 0 z ;M 100.43 0 C 99.44111609671702 17.552560474217483, 85.45003481640393 29.038106989746822, 76.37478035974965 44.09499999999999 C 67.47982214730594 58.85276076308644, 64.07619623688856 76.5210513546238, 49.13500000000001 85.10431642989678 C 34.197839864932604 93.68526288681738, 17.224945520414785 88.19944893969671, 5.386608946049633e-15 87.97 C -16.995859874251966 87.74360264955502, -33.675744430814035 92.32280785019591, -48.38499999999998 83.80527832422013 C -63.09093119233604 75.28967380919008, -67.46629494853046 58.573580703738266, -76.07167146842508 43.92000000000003 C -84.74078159210374 29.157891156391287, -97.50578376593529 17.119125303246612, -97.6 1.1952552759678167e-14 C -97.6942955026296 -17.13352843141885, -85.16966290503643 -29.388429432236997, -76.5566456945444 -44.19999999999998 C -67.96991930904315 -58.966358953746784, -62.77231119032221 -74.64857202786988, -48.62500000000004 -84.22097051803664 C -34.121978463364755 -94.03405086895964, -17.446142869940783 -97.50541642989344, -1.7634913907721887e-14 -96 C 16.824136546866306 -94.54825609504428, 29.53246273910814 -84.92008419882137, 44.00999999999994 -76.22755604110633 C 58.26564148077935 -67.66825740177873, 71.6180443525204 -60.425177429348025, 81.51031100419134 -47.060000000000045 C 92.07153193494764 -32.79101629986303, 101.4285520767086 -17.724169293174832, 100.43 0 z ;M 97.27 0 C 98.58345261039341 17.558366186082086, 94.2994917286897 34.203939932148074, 84.091066707469 48.54999999999999 C 74.21975411889315 62.42231066985079, 58.473444022898576 67.23312887448718, 43.57000000000001 75.46545368577598 C 28.941333692804605 83.54599751254223, 16.64874697133146 93.54662780123404, 5.8170722959499274e-15 95 C -17.27803955307615 96.50830704429953, -33.78857056294901 93.13333275238398, -48.19499999999998 83.47618867078205 C -62.265894952404224 74.04396533562448, -68.01933932212052 58.825944468473296, -76.14095350072783 43.96000000000003 C -84.0905443486636 29.408930041052358, -92.00739521206805 16.483816295811398, -93.8 1.1487186976002173e-14 C -95.70727280919573 -17.538240901971744, -94.76889052685837 -34.35072747684755, -86.34273275730855 -49.84999999999997 C -77.83404631199598 -65.50107770786477, -64.5344993843803 -76.3187721614444, -48.310000000000045 -83.67537451365246 C -32.817324666057125 -90.70014915251777, -17.009590728815464 -88.78959332709252, -1.6349034768617164e-14 -89 C 17.210968156731738 -89.21289768843408, 34.09370369400777 -93.47659088564015, 49.00499999999994 -84.87914982491287 C 63.91783177263862 -76.28082345658234, 68.61922431545376 -59.49398069945713, 77.12822246104209 -44.530000000000044 C 85.58365918742902 -29.660212768381562, 95.99397423560407 -17.058040356269963, 97.27 0 z ;M 102 0 C 102 17.85951467281289, 86.87204367700592 29.533206594083104, 77.94228634059948 44.99999999999999 C 69.01252900419304 60.46679340591688, 66.4667934059169 79.40483384960629, 51.000000000000014 88.33459118601273 C 35.53320659408312 97.26434852241918, 17.859514672812903 90, 5.5109105961630896e-15 90 C -17.85951467281288 90, -35.53320659408308 97.26434852241918, -50.99999999999998 88.33459118601274 C -66.46679340591687 79.4048338496063, -69.01252900419303 60.46679340591692, -77.94228634059947 45.00000000000003 C -86.87204367700592 29.533206594083133, -102 17.859514672812914, -102 1.2491397351303002e-14 C -102 -17.85951467281287, -86.87204367700593 -29.533206594083083, -77.9422863405995 -44.99999999999997 C -69.01252900419306 -60.46679340591687, -66.46679340591693 -79.40483384960628, -51.00000000000004 -88.33459118601273 C -35.53320659408315 -97.26434852241918, -17.85951467281292 -89.99999999999999, -1.6532731788489267e-14 -90 C 17.859514672812853 -90.00000000000001, 35.533206594083055 -97.26434852241921, 50.99999999999993 -88.33459118601279 C 66.46679340591683 -79.40483384960635, 69.012529004193 -60.46679340591694, 77.94228634059945 -45.00000000000004 C 86.8720436770059 -29.53320659408314, 102 -17.85951467281291, 102 0 z ;"					dur="30s" repeatCount="indefinite"></animate><animateTransform id="ratate3" attributeName="transform" type="rotate" from="54" to="416" dur="15s"					repeatCount="indefinite"></animateTransform><animateTransform id="cat1" attributeName="transform" type="scale" values="1;1.05;1.05;1.02;1" dur="0.15s"					begin="shell_avatar.mousedown" repeatCount="1" additive="sum"></animateTransform></path></g><g fill="url(#grad2)" transform="rotate(74)"><path id="c2" d="M 98.1584 0 C 98.3156 17.3952 89.0511 31.3348 79.5494 45.9279 C 70.339 60.0814 60.6163 71.2177 46.1724 79.9729 C 31.4266 88.9178 17.2493 94.3909 5.77261e-15 94.2739 C -17.1547 94.1581 -30.8225 87.6907 -45.7979 79.3244 C -61.0143 70.8266 -73.5583 62.554 -83.0507 47.9493 C -92.6677 33.1579 -98.4872 17.5705 -97.1793 1.19010e-14 C -95.9465 -16.9777 -84.488 -29.0862 -76.1351 -43.9566 C -67.6795 -59.0155 -63.8629 -76.1085 -49.262 -85.3243 C -34.502 -94.6464 -17.4328 -93.0037 -1.69174e-14 -92.0939 C 16.8967 -91.214 31.8608 -89.0341 46.4198 -80.4014 C 60.872 -71.8326 69.6003 -59.5351 78.6792 -45.4254 C 88.0511 -30.9104 98.015 -17.2766 98.1584 0 Z"><animate id="wave2" attributeName="d" values="M 102 0 C 102 17.85951467281289, 86.87204367700592 29.533206594083104, 77.94228634059948 44.99999999999999 C 69.01252900419304 60.46679340591688, 66.4667934059169 79.40483384960629, 51.000000000000014 88.33459118601273 C 35.53320659408312 97.26434852241918, 17.859514672812903 90, 5.5109105961630896e-15 90 C -17.85951467281288 90, -35.53320659408308 97.26434852241918, -50.99999999999998 88.33459118601274 C -66.46679340591687 79.4048338496063, -69.01252900419303 60.46679340591692, -77.94228634059947 45.00000000000003 C -86.87204367700592 29.533206594083133, -102 17.859514672812914, -102 1.2491397351303002e-14 C -102 -17.85951467281287, -86.87204367700593 -29.533206594083083, -77.9422863405995 -44.99999999999997 C -69.01252900419306 -60.46679340591687, -66.46679340591693 -79.40483384960628, -51.00000000000004 -88.33459118601273 C -35.53320659408315 -97.26434852241918, -17.85951467281292 -89.99999999999999, -1.6532731788489267e-14 -90 C 17.859514672812853 -90.00000000000001, 35.533206594083055 -97.26434852241921, 50.99999999999993 -88.33459118601279 C 66.46679340591683 -79.40483384960635, 69.012529004193 -60.46679340591694, 77.94228634059945 -45.00000000000004 C 86.8720436770059 -29.53320659408314, 102 -17.85951467281291, 102 0 z ;M 104 0 C 103.6860370504768 18.670459122547623, 99.74513350853894 36.21879096669579, 88.33459118601274 50.99999999999999 C 77.42609021132327 65.13086500091876, 59.95986915829964 68.15050131663435, 44.50000000000001 77.07626093681503 C 29.040130841700375 86.00202055699572, 17.851519240361377 102, 6.245698675651501e-15 102 C -17.851519240361355 102, -28.89224164002164 85.74082198544978, -44.49999999999998 77.07626093681505 C -60.41578578366853 68.24070016127133, -78.942855942454 66.40974514759691, -90.0666419935816 52.000000000000036 C -101.58041073743591 37.08507152827802, -106.51375198961607 18.673591324066255, -104 1.2736326711132473e-14 C -101.57139126725896 -18.041098385442222, -86.17817517682458 -28.73502209016882, -77.07626093681506 -44.49999999999998 C -67.97434669680554 -60.264977909831146, -66.77256915682678 -79.42941623510848, -52.00000000000004 -90.0666419935816 C -36.96347614018194 -100.89393257665785, -18.33904556278876 -102.64701322308922, -1.8369701987210297e-14 -100 C 17.32727177622791 -97.49902374391826, 28.55026288749344 -84.4439984999364, 43.99999999999994 -76.21023553303064 C 60.07413421086994 -67.64370718198207, 78.79942390068253 -66.31128907769772, 90.06664199358158 -52.00000000000004 C 101.7221231317663 -37.19555062013585, 104.31680324149117 -18.83936298577321, 104 0 z ;M 102 0 C 101.82727211782054 17.85068357984393, 86.53189445508919 29.35841045474146, 77.07626093681505 44.49999999999999 C 67.96000753916402 59.09812997944896, 63.13859410212405 75.0566405949403, 49.000000000000014 84.87048957087498 C 34.41435518048109 94.99464438014832, 17.754300288879765 97.84390177587221, 6.000769315822031e-15 98 C -17.848085350949756 98.1569227951557, -34.936562555189376 96.05567507853976, -49.49999999999998 85.73651497465943 C -63.65084226105117 75.70970588855481, -67.15343120157955 58.79045409878119, -76.21023553303058 44.00000000000003 C -85.53194873850353 28.77692945084744, -101.82533168325062 17.849529545864502, -102 1.2491397351303002e-14 C -102.17467942383016 -17.85066458952948, -86.26579096020939 -29.195449136347488, -77.07626093681506 -44.49999999999998 C -68.05733453379239 -59.52042188438431, -65.25784853671414 -77.99137523784161, -50.00000000000004 -86.60254037844385 C -34.75370973790514 -95.20718230502631, -17.506833792572294 -87.99999999999999, -1.6165337748745062e-14 -88 C 17.50683379257223 -88.00000000000001, 34.671187347637854 -95.05929697358921, 49.999999999999936 -86.6025403784439 C 65.35816177516672 -78.12959215818911, 68.91293714727685 -60.037780348188306, 77.94228634059945 -45.00000000000004 C 87.13593221909689 -29.68859445350606, 102.172805244453 -17.858678638015444, 102 0 z ;M 88 0 C 87.0071643812453 16.750584310000846, 89.16591640357322 32.23066622251636, 82.48891971046778 47.62499999999999 C 75.39770857425334 63.9743373046321, 66.1406553264614 78.9687582413302, 50.250000000000014 87.03555308033607 C 34.54865539228622 95.00624548067042, 17.590620651271553 90.29638240436964, 5.480294426184406e-15 89.5 C -16.847968824431476 88.7372397661719, -32.382980242828936 89.6818280646011, -47.689999999999976 82.60150301295975 C -63.74959324223292 75.1730719952966, -77.27142977762603 65.04430269303984, -86.06560462809749 49.69000000000003 C -94.84784120247872 34.35654109365306, -96.67880542645688 17.590459164590612, -95 1.1634144591899855e-14 C -93.40474991806319 -16.714969454704665, -85.83878040009859 -30.176827189787602, -77.07626093681506 -44.49999999999998 C -68.48875537139932 -58.53709592172691, -59.78684881708811 -70.71810123462024, -46.12500000000004 -79.89084349911445 C -31.90399782177102 -89.43900857326942, -17.117492172090376 -95.6208569519316, -1.7680838162689912e-14 -96.25 C 17.42616675853088 -96.89048819537281, 32.604872069000194 -91.30523706046031, 48.124999999999936 -83.35494511425226 C 64.20208148728074 -75.11934989009448, 80.53937872975759 -67.29516003624032, 88.33459118601272 -51.00000000000004 C 96.03774549832913 -34.897278873736724, 89.0561690198359 -17.81911111787299, 88 0 z ;M 97 0 C 95.96205478306072 17.380245680862355, 92.31438589595038 33.26885450645463, 82.33303513778658 47.53499999999999 C 72.73454993850302 61.25392338906356, 58.07526843673644 67.1203245271079, 43.85500000000001 75.95908816593311 C 29.1689379616367 85.08737092091096, 17.266933647153582 97.78319544979668, 6.0442442771917615e-15 98.71 C -17.46539769433808 99.64745712962134, -31.760081272699992 89.97780532702197, -46.659999999999975 80.81749068116382 C -61.254519580560164 71.8449322457867, -74.9987279481924 63.057416617025154, -82.80068885583016 47.80500000000003 C -90.46529056195176 32.82111328110031, -87.3041822839497 16.816028610356618, -88 1.0776891832496709e-14 C -88.72578785785936 -17.54032572221827, -95.38715406508265 -34.80323520486043, -86.85368774554138 -50.144999999999975 C -78.30929038357452 -65.50641700627851, -59.99419319499677 -68.75787837688742, -44.82000000000004 -77.63051719523706 C -29.55758597966676 -86.55474040488905, -17.677948608071002 -101.20050810368325, -1.8540540215691355e-14 -100.93 C 17.66220221833233 -100.65973284769198, 28.66762264672243 -84.98120430879537, 44.03499999999994 -76.27085731129554 C 59.54270404931096 -67.48097206941182, 78.04582993349926 -65.57146684415069, 88.2133476294829 -50.93000000000004 C 98.53103081570782 -36.07229128519377, 98.0783410651801 -18.056668439457074, 97 0 z ;M 97 0 C 95.96205478306072 17.380245680862355, 92.31438589595038 33.26885450645463, 82.33303513778658 47.53499999999999 C 72.73454993850302 61.25392338906356, 58.07526843673644 67.1203245271079, 43.85500000000001 75.95908816593311 C 29.1689379616367 85.08737092091096, 17.266933647153582 97.78319544979668, 6.0442442771917615e-15 98.71 C -17.46539769433808 99.64745712962134, -31.760081272699992 89.97780532702197, -46.659999999999975 80.81749068116382 C -61.254519580560164 71.8449322457867, -74.9987279481924 63.057416617025154, -82.80068885583016 47.80500000000003 C -90.46529056195176 32.82111328110031, -87.3041822839497 16.816028610356618, -88 1.0776891832496709e-14 C -88.72578785785936 -17.54032572221827, -95.38715406508265 -34.80323520486043, -86.85368774554138 -50.144999999999975 C -78.30929038357452 -65.50641700627851, -59.99419319499677 -68.75787837688742, -44.82000000000004 -77.63051719523706 C -29.55758597966676 -86.55474040488905, -17.677948608071002 -101.20050810368325, -1.8540540215691355e-14 -100.93 C 17.66220221833233 -100.65973284769198, 28.66762264672243 -84.98120430879537, 44.03499999999994 -76.27085731129554 C 59.54270404931096 -67.48097206941182, 78.04582993349926 -65.57146684415069, 88.2133476294829 -50.93000000000004 C 98.53103081570782 -36.07229128519377, 98.0783410651801 -18.056668439457074, 97 0 z ;M 87.83 0 C 87.5551104106254 17.484718516847604, 95.16127715466017 34.74963105642935, 86.50727758402758 49.94499999999999 C 77.84990328247498 65.14629455992826, 59.80875022938145 68.6539166070951, 44.21500000000001 76.5826264566579 C 29.396758375489803 84.11702559690347, 16.533901742833184 92.20444258129785, 5.7515536921955445e-15 93.93 C -17.56198148944071 95.76285276019921, -35.17832492952776 96.1755728839107, -49.88499999999998 86.40335453557344 C -64.42964616977311 76.73880034577543, -67.07555683863683 58.889186090717956, -75.63865876653286 43.67000000000003 C -84.09849199523896 28.63435318786967, -98.51711635059414 17.25222189595266, -98.5 1.206277097160143e-14 C -98.48288504887265 -17.250811320073485, -84.34877504334715 -28.780575409619935, -75.55205622615443 -43.619999999999976 C -66.86093647073717 -58.281286656612146, -63.230342222349634 -75.4345590754149, -48.600000000000044 -84.17766924784742 C -33.93357389700559 -92.94234319091034, -17.025973616417954 -90.19821090033776, -1.630678445404658e-14 -88.77 C 15.977895940302826 -87.42970630164737, 29.38189187799461 -82.73892939223205, 44.10999999999994 -76.40076112186321 C 60.461233804495656 -69.36408876567695, 79.25079249329674 -66.31020434586661, 88.09210407295308 -50.86000000000004 C 96.93350510099964 -35.40963934294652, 88.10983120877545 -17.799036801646473, 87.83 0 z ;M 102.87 0 C 100.60412172987674 17.8655933362356, 85.53754352796288 28.604858280384207, 75.95908816593312 43.855 C 66.77647829932806 58.47490441348097, 64.20185353081875 76.67202079060546, 49.27000000000002 85.33814328891859 C 34.33463676216738 94.00630274472348, 17.255471196681203 88.61139941746183, 5.384771975850912e-15 87.94 C -16.62338090404565 87.29319481409648, -32.13105073147386 88.83642498642243, -47.104999999999976 81.58825329053197 C -62.593549158874595 74.0909884333756, -75.11183789801551 63.203277636192524, -82.85265038005723 47.83500000000003 C -90.43100426068291 32.78926071449635, -88.33481436911549 16.845994873358578, -88.2 1.0801384768479656e-14 C -88.0661541958799 -16.72496592774988, -90.31714156576788 -32.8325291006581, -82.09054802472696 -47.394999999999975 C -73.84119732253154 -61.99775494831187, -58.70114242558277 -68.16576009477593, -44.58000000000004 -77.21482500142054 C -29.826455382596357 -86.66914383925732, -17.522369834392396 -100.13333736150332, -1.8369701987210297e-14 -100 C 17.510547309053553 -99.86675260260256, 28.908254552710822 -85.0894876419882, 44.18999999999994 -76.53932518646872 C 59.70239533946346 -67.86011372570036, 77.14713304516553 -64.89164530763992, 87.9622002623854 -50.78500000000004 C 99.23322575875696 -36.08362498889298, 105.20080735972847 -18.37753465535834, 102.87 0 z ;M 96.65 0 C 97.5682370155223 17.290645042626103, 91.44243921640975 32.85986013368205, 81.65753532283473 47.144999999999996 C 72.23761953500264 60.89728781209352, 58.31868393027413 67.69602416070182, 44.205000000000005 76.5653059485822 C 29.586348647997518 85.75191795153148, 17.265486227503665 98.5023411385901, 6.0289361922024196e-15 98.46 C -17.260135494401737 98.41767198331847, -28.927850358240754 84.61477988915865, -44.07999999999998 76.34879959763612 C -59.63539109726837 67.86283824713713, -77.60369551546168 65.19715075831209, -87.6850721331744 50.625000000000036 C -97.93164740539275 35.81406243807856, -99.13895928925051 17.870177323503324, -96.9 1.1866827483737853e-14 C -94.78582581853146 -16.874209235069404, -84.03526438034655 -28.885451186299278, -75.855165117479 -43.79499999999998 C -67.48656343152348 -59.04812484966506, -64.58702634493868 -77.07802892327148, -49.685000000000045 -86.05694437405965 C -34.754341245902474 -95.05311170556791, -17.423866102474058 -90.01428351214383, -1.6440883278553216e-14 -89.5 C 16.944874403202444 -88.99985442555268, 33.406945286813375 -91.76595741651028, 48.01999999999994 -83.17307977945752 C 62.60280079933599 -74.59799227491723, 68.26035047536544 -58.944088507890214, 76.799132807604 -44.340000000000046 C 85.38138197865302 -29.66156909334073, 95.74829471964232 -16.979348111836277, 96.65 0 z ;M 100.43 0 C 99.44111609671702 17.552560474217483, 85.45003481640393 29.038106989746822, 76.37478035974965 44.09499999999999 C 67.47982214730594 58.85276076308644, 64.07619623688856 76.5210513546238, 49.13500000000001 85.10431642989678 C 34.197839864932604 93.68526288681738, 17.224945520414785 88.19944893969671, 5.386608946049633e-15 87.97 C -16.995859874251966 87.74360264955502, -33.675744430814035 92.32280785019591, -48.38499999999998 83.80527832422013 C -63.09093119233604 75.28967380919008, -67.46629494853046 58.573580703738266, -76.07167146842508 43.92000000000003 C -84.74078159210374 29.157891156391287, -97.50578376593529 17.119125303246612, -97.6 1.1952552759678167e-14 C -97.6942955026296 -17.13352843141885, -85.16966290503643 -29.388429432236997, -76.5566456945444 -44.19999999999998 C -67.96991930904315 -58.966358953746784, -62.77231119032221 -74.64857202786988, -48.62500000000004 -84.22097051803664 C -34.121978463364755 -94.03405086895964, -17.446142869940783 -97.50541642989344, -1.7634913907721887e-14 -96 C 16.824136546866306 -94.54825609504428, 29.53246273910814 -84.92008419882137, 44.00999999999994 -76.22755604110633 C 58.26564148077935 -67.66825740177873, 71.6180443525204 -60.425177429348025, 81.51031100419134 -47.060000000000045 C 92.07153193494764 -32.79101629986303, 101.4285520767086 -17.724169293174832, 100.43 0 z ;M 97.27 0 C 98.58345261039341 17.558366186082086, 94.2994917286897 34.203939932148074, 84.091066707469 48.54999999999999 C 74.21975411889315 62.42231066985079, 58.473444022898576 67.23312887448718, 43.57000000000001 75.46545368577598 C 28.941333692804605 83.54599751254223, 16.64874697133146 93.54662780123404, 5.8170722959499274e-15 95 C -17.27803955307615 96.50830704429953, -33.78857056294901 93.13333275238398, -48.19499999999998 83.47618867078205 C -62.265894952404224 74.04396533562448, -68.01933932212052 58.825944468473296, -76.14095350072783 43.96000000000003 C -84.0905443486636 29.408930041052358, -92.00739521206805 16.483816295811398, -93.8 1.1487186976002173e-14 C -95.70727280919573 -17.538240901971744, -94.76889052685837 -34.35072747684755, -86.34273275730855 -49.84999999999997 C -77.83404631199598 -65.50107770786477, -64.5344993843803 -76.3187721614444, -48.310000000000045 -83.67537451365246 C -32.817324666057125 -90.70014915251777, -17.009590728815464 -88.78959332709252, -1.6349034768617164e-14 -89 C 17.210968156731738 -89.21289768843408, 34.09370369400777 -93.47659088564015, 49.00499999999994 -84.87914982491287 C 63.91783177263862 -76.28082345658234, 68.61922431545376 -59.49398069945713, 77.12822246104209 -44.530000000000044 C 85.58365918742902 -29.660212768381562, 95.99397423560407 -17.058040356269963, 97.27 0 z ;M 102 0 C 102 17.85951467281289, 86.87204367700592 29.533206594083104, 77.94228634059948 44.99999999999999 C 69.01252900419304 60.46679340591688, 66.4667934059169 79.40483384960629, 51.000000000000014 88.33459118601273 C 35.53320659408312 97.26434852241918, 17.859514672812903 90, 5.5109105961630896e-15 90 C -17.85951467281288 90, -35.53320659408308 97.26434852241918, -50.99999999999998 88.33459118601274 C -66.46679340591687 79.4048338496063, -69.01252900419303 60.46679340591692, -77.94228634059947 45.00000000000003 C -86.87204367700592 29.533206594083133, -102 17.859514672812914, -102 1.2491397351303002e-14 C -102 -17.85951467281287, -86.87204367700593 -29.533206594083083, -77.9422863405995 -44.99999999999997 C -69.01252900419306 -60.46679340591687, -66.46679340591693 -79.40483384960628, -51.00000000000004 -88.33459118601273 C -35.53320659408315 -97.26434852241918, -17.85951467281292 -89.99999999999999, -1.6532731788489267e-14 -90 C 17.859514672812853 -90.00000000000001, 35.533206594083055 -97.26434852241921, 50.99999999999993 -88.33459118601279 C 66.46679340591683 -79.40483384960635, 69.012529004193 -60.46679340591694, 77.94228634059945 -45.00000000000004 C 86.8720436770059 -29.53320659408314, 102 -17.85951467281291, 102 0 z ;"					dur="30s" repeatCount="indefinite"></animate><animateTransform id="cat1" attributeName="transform" type="scale" values="1;1.05;1.05;1.02;1" dur="0.15s"					begin="shell_avatar.mousedown" repeatCount="1" additive="sum"></animateTransform></path></g><g fill="url(#grad1)" transform="rotate(90)"><path id="c1" d="M 98.1584 0 C 98.3156 17.3952 89.0511 31.3348 79.5494 45.9279 C 70.339 60.0814 60.6163 71.2177 46.1724 79.9729 C 31.4266 88.9178 17.2493 94.3909 5.77261e-15 94.2739 C -17.1547 94.1581 -30.8225 87.6907 -45.7979 79.3244 C -61.0143 70.8266 -73.5583 62.554 -83.0507 47.9493 C -92.6677 33.1579 -98.4872 17.5705 -97.1793 1.19010e-14 C -95.9465 -16.9777 -84.488 -29.0862 -76.1351 -43.9566 C -67.6795 -59.0155 -63.8629 -76.1085 -49.262 -85.3243 C -34.502 -94.6464 -17.4328 -93.0037 -1.69174e-14 -92.0939 C 16.8967 -91.214 31.8608 -89.0341 46.4198 -80.4014 C 60.872 -71.8326 69.6003 -59.5351 78.6792 -45.4254 C 88.0511 -30.9104 98.015 -17.2766 98.1584 0 Z"				transform="rotate(364.878)"><animate id="wave1" attributeName="d" values="M 102 0 C 102 17.85951467281289, 86.87204367700592 29.533206594083104, 77.94228634059948 44.99999999999999 C 69.01252900419304 60.46679340591688, 66.4667934059169 79.40483384960629, 51.000000000000014 88.33459118601273 C 35.53320659408312 97.26434852241918, 17.859514672812903 90, 5.5109105961630896e-15 90 C -17.85951467281288 90, -35.53320659408308 97.26434852241918, -50.99999999999998 88.33459118601274 C -66.46679340591687 79.4048338496063, -69.01252900419303 60.46679340591692, -77.94228634059947 45.00000000000003 C -86.87204367700592 29.533206594083133, -102 17.859514672812914, -102 1.2491397351303002e-14 C -102 -17.85951467281287, -86.87204367700593 -29.533206594083083, -77.9422863405995 -44.99999999999997 C -69.01252900419306 -60.46679340591687, -66.46679340591693 -79.40483384960628, -51.00000000000004 -88.33459118601273 C -35.53320659408315 -97.26434852241918, -17.85951467281292 -89.99999999999999, -1.6532731788489267e-14 -90 C 17.859514672812853 -90.00000000000001, 35.533206594083055 -97.26434852241921, 50.99999999999993 -88.33459118601279 C 66.46679340591683 -79.40483384960635, 69.012529004193 -60.46679340591694, 77.94228634059945 -45.00000000000004 C 86.8720436770059 -29.53320659408314, 102 -17.85951467281291, 102 0 z ;M 104 0 C 103.6860370504768 18.670459122547623, 99.74513350853894 36.21879096669579, 88.33459118601274 50.99999999999999 C 77.42609021132327 65.13086500091876, 59.95986915829964 68.15050131663435, 44.50000000000001 77.07626093681503 C 29.040130841700375 86.00202055699572, 17.851519240361377 102, 6.245698675651501e-15 102 C -17.851519240361355 102, -28.89224164002164 85.74082198544978, -44.49999999999998 77.07626093681505 C -60.41578578366853 68.24070016127133, -78.942855942454 66.40974514759691, -90.0666419935816 52.000000000000036 C -101.58041073743591 37.08507152827802, -106.51375198961607 18.673591324066255, -104 1.2736326711132473e-14 C -101.57139126725896 -18.041098385442222, -86.17817517682458 -28.73502209016882, -77.07626093681506 -44.49999999999998 C -67.97434669680554 -60.264977909831146, -66.77256915682678 -79.42941623510848, -52.00000000000004 -90.0666419935816 C -36.96347614018194 -100.89393257665785, -18.33904556278876 -102.64701322308922, -1.8369701987210297e-14 -100 C 17.32727177622791 -97.49902374391826, 28.55026288749344 -84.4439984999364, 43.99999999999994 -76.21023553303064 C 60.07413421086994 -67.64370718198207, 78.79942390068253 -66.31128907769772, 90.06664199358158 -52.00000000000004 C 101.7221231317663 -37.19555062013585, 104.31680324149117 -18.83936298577321, 104 0 z ;M 102 0 C 101.82727211782054 17.85068357984393, 86.53189445508919 29.35841045474146, 77.07626093681505 44.49999999999999 C 67.96000753916402 59.09812997944896, 63.13859410212405 75.0566405949403, 49.000000000000014 84.87048957087498 C 34.41435518048109 94.99464438014832, 17.754300288879765 97.84390177587221, 6.000769315822031e-15 98 C -17.848085350949756 98.1569227951557, -34.936562555189376 96.05567507853976, -49.49999999999998 85.73651497465943 C -63.65084226105117 75.70970588855481, -67.15343120157955 58.79045409878119, -76.21023553303058 44.00000000000003 C -85.53194873850353 28.77692945084744, -101.82533168325062 17.849529545864502, -102 1.2491397351303002e-14 C -102.17467942383016 -17.85066458952948, -86.26579096020939 -29.195449136347488, -77.07626093681506 -44.49999999999998 C -68.05733453379239 -59.52042188438431, -65.25784853671414 -77.99137523784161, -50.00000000000004 -86.60254037844385 C -34.75370973790514 -95.20718230502631, -17.506833792572294 -87.99999999999999, -1.6165337748745062e-14 -88 C 17.50683379257223 -88.00000000000001, 34.671187347637854 -95.05929697358921, 49.999999999999936 -86.6025403784439 C 65.35816177516672 -78.12959215818911, 68.91293714727685 -60.037780348188306, 77.94228634059945 -45.00000000000004 C 87.13593221909689 -29.68859445350606, 102.172805244453 -17.858678638015444, 102 0 z ;M 88 0 C 87.0071643812453 16.750584310000846, 89.16591640357322 32.23066622251636, 82.48891971046778 47.62499999999999 C 75.39770857425334 63.9743373046321, 66.1406553264614 78.9687582413302, 50.250000000000014 87.03555308033607 C 34.54865539228622 95.00624548067042, 17.590620651271553 90.29638240436964, 5.480294426184406e-15 89.5 C -16.847968824431476 88.7372397661719, -32.382980242828936 89.6818280646011, -47.689999999999976 82.60150301295975 C -63.74959324223292 75.1730719952966, -77.27142977762603 65.04430269303984, -86.06560462809749 49.69000000000003 C -94.84784120247872 34.35654109365306, -96.67880542645688 17.590459164590612, -95 1.1634144591899855e-14 C -93.40474991806319 -16.714969454704665, -85.83878040009859 -30.176827189787602, -77.07626093681506 -44.49999999999998 C -68.48875537139932 -58.53709592172691, -59.78684881708811 -70.71810123462024, -46.12500000000004 -79.89084349911445 C -31.90399782177102 -89.43900857326942, -17.117492172090376 -95.6208569519316, -1.7680838162689912e-14 -96.25 C 17.42616675853088 -96.89048819537281, 32.604872069000194 -91.30523706046031, 48.124999999999936 -83.35494511425226 C 64.20208148728074 -75.11934989009448, 80.53937872975759 -67.29516003624032, 88.33459118601272 -51.00000000000004 C 96.03774549832913 -34.897278873736724, 89.0561690198359 -17.81911111787299, 88 0 z ;M 97 0 C 95.96205478306072 17.380245680862355, 92.31438589595038 33.26885450645463, 82.33303513778658 47.53499999999999 C 72.73454993850302 61.25392338906356, 58.07526843673644 67.1203245271079, 43.85500000000001 75.95908816593311 C 29.1689379616367 85.08737092091096, 17.266933647153582 97.78319544979668, 6.0442442771917615e-15 98.71 C -17.46539769433808 99.64745712962134, -31.760081272699992 89.97780532702197, -46.659999999999975 80.81749068116382 C -61.254519580560164 71.8449322457867, -74.9987279481924 63.057416617025154, -82.80068885583016 47.80500000000003 C -90.46529056195176 32.82111328110031, -87.3041822839497 16.816028610356618, -88 1.0776891832496709e-14 C -88.72578785785936 -17.54032572221827, -95.38715406508265 -34.80323520486043, -86.85368774554138 -50.144999999999975 C -78.30929038357452 -65.50641700627851, -59.99419319499677 -68.75787837688742, -44.82000000000004 -77.63051719523706 C -29.55758597966676 -86.55474040488905, -17.677948608071002 -101.20050810368325, -1.8540540215691355e-14 -100.93 C 17.66220221833233 -100.65973284769198, 28.66762264672243 -84.98120430879537, 44.03499999999994 -76.27085731129554 C 59.54270404931096 -67.48097206941182, 78.04582993349926 -65.57146684415069, 88.2133476294829 -50.93000000000004 C 98.53103081570782 -36.07229128519377, 98.0783410651801 -18.056668439457074, 97 0 z ;M 97 0 C 95.96205478306072 17.380245680862355, 92.31438589595038 33.26885450645463, 82.33303513778658 47.53499999999999 C 72.73454993850302 61.25392338906356, 58.07526843673644 67.1203245271079, 43.85500000000001 75.95908816593311 C 29.1689379616367 85.08737092091096, 17.266933647153582 97.78319544979668, 6.0442442771917615e-15 98.71 C -17.46539769433808 99.64745712962134, -31.760081272699992 89.97780532702197, -46.659999999999975 80.81749068116382 C -61.254519580560164 71.8449322457867, -74.9987279481924 63.057416617025154, -82.80068885583016 47.80500000000003 C -90.46529056195176 32.82111328110031, -87.3041822839497 16.816028610356618, -88 1.0776891832496709e-14 C -88.72578785785936 -17.54032572221827, -95.38715406508265 -34.80323520486043, -86.85368774554138 -50.144999999999975 C -78.30929038357452 -65.50641700627851, -59.99419319499677 -68.75787837688742, -44.82000000000004 -77.63051719523706 C -29.55758597966676 -86.55474040488905, -17.677948608071002 -101.20050810368325, -1.8540540215691355e-14 -100.93 C 17.66220221833233 -100.65973284769198, 28.66762264672243 -84.98120430879537, 44.03499999999994 -76.27085731129554 C 59.54270404931096 -67.48097206941182, 78.04582993349926 -65.57146684415069, 88.2133476294829 -50.93000000000004 C 98.53103081570782 -36.07229128519377, 98.0783410651801 -18.056668439457074, 97 0 z ;M 87.83 0 C 87.5551104106254 17.484718516847604, 95.16127715466017 34.74963105642935, 86.50727758402758 49.94499999999999 C 77.84990328247498 65.14629455992826, 59.80875022938145 68.6539166070951, 44.21500000000001 76.5826264566579 C 29.396758375489803 84.11702559690347, 16.533901742833184 92.20444258129785, 5.7515536921955445e-15 93.93 C -17.56198148944071 95.76285276019921, -35.17832492952776 96.1755728839107, -49.88499999999998 86.40335453557344 C -64.42964616977311 76.73880034577543, -67.07555683863683 58.889186090717956, -75.63865876653286 43.67000000000003 C -84.09849199523896 28.63435318786967, -98.51711635059414 17.25222189595266, -98.5 1.206277097160143e-14 C -98.48288504887265 -17.250811320073485, -84.34877504334715 -28.780575409619935, -75.55205622615443 -43.619999999999976 C -66.86093647073717 -58.281286656612146, -63.230342222349634 -75.4345590754149, -48.600000000000044 -84.17766924784742 C -33.93357389700559 -92.94234319091034, -17.025973616417954 -90.19821090033776, -1.630678445404658e-14 -88.77 C 15.977895940302826 -87.42970630164737, 29.38189187799461 -82.73892939223205, 44.10999999999994 -76.40076112186321 C 60.461233804495656 -69.36408876567695, 79.25079249329674 -66.31020434586661, 88.09210407295308 -50.86000000000004 C 96.93350510099964 -35.40963934294652, 88.10983120877545 -17.799036801646473, 87.83 0 z ;M 102.87 0 C 100.60412172987674 17.8655933362356, 85.53754352796288 28.604858280384207, 75.95908816593312 43.855 C 66.77647829932806 58.47490441348097, 64.20185353081875 76.67202079060546, 49.27000000000002 85.33814328891859 C 34.33463676216738 94.00630274472348, 17.255471196681203 88.61139941746183, 5.384771975850912e-15 87.94 C -16.62338090404565 87.29319481409648, -32.13105073147386 88.83642498642243, -47.104999999999976 81.58825329053197 C -62.593549158874595 74.0909884333756, -75.11183789801551 63.203277636192524, -82.85265038005723 47.83500000000003 C -90.43100426068291 32.78926071449635, -88.33481436911549 16.845994873358578, -88.2 1.0801384768479656e-14 C -88.0661541958799 -16.72496592774988, -90.31714156576788 -32.8325291006581, -82.09054802472696 -47.394999999999975 C -73.84119732253154 -61.99775494831187, -58.70114242558277 -68.16576009477593, -44.58000000000004 -77.21482500142054 C -29.826455382596357 -86.66914383925732, -17.522369834392396 -100.13333736150332, -1.8369701987210297e-14 -100 C 17.510547309053553 -99.86675260260256, 28.908254552710822 -85.0894876419882, 44.18999999999994 -76.53932518646872 C 59.70239533946346 -67.86011372570036, 77.14713304516553 -64.89164530763992, 87.9622002623854 -50.78500000000004 C 99.23322575875696 -36.08362498889298, 105.20080735972847 -18.37753465535834, 102.87 0 z ;M 96.65 0 C 97.5682370155223 17.290645042626103, 91.44243921640975 32.85986013368205, 81.65753532283473 47.144999999999996 C 72.23761953500264 60.89728781209352, 58.31868393027413 67.69602416070182, 44.205000000000005 76.5653059485822 C 29.586348647997518 85.75191795153148, 17.265486227503665 98.5023411385901, 6.0289361922024196e-15 98.46 C -17.260135494401737 98.41767198331847, -28.927850358240754 84.61477988915865, -44.07999999999998 76.34879959763612 C -59.63539109726837 67.86283824713713, -77.60369551546168 65.19715075831209, -87.6850721331744 50.625000000000036 C -97.93164740539275 35.81406243807856, -99.13895928925051 17.870177323503324, -96.9 1.1866827483737853e-14 C -94.78582581853146 -16.874209235069404, -84.03526438034655 -28.885451186299278, -75.855165117479 -43.79499999999998 C -67.48656343152348 -59.04812484966506, -64.58702634493868 -77.07802892327148, -49.685000000000045 -86.05694437405965 C -34.754341245902474 -95.05311170556791, -17.423866102474058 -90.01428351214383, -1.6440883278553216e-14 -89.5 C 16.944874403202444 -88.99985442555268, 33.406945286813375 -91.76595741651028, 48.01999999999994 -83.17307977945752 C 62.60280079933599 -74.59799227491723, 68.26035047536544 -58.944088507890214, 76.799132807604 -44.340000000000046 C 85.38138197865302 -29.66156909334073, 95.74829471964232 -16.979348111836277, 96.65 0 z ;M 100.43 0 C 99.44111609671702 17.552560474217483, 85.45003481640393 29.038106989746822, 76.37478035974965 44.09499999999999 C 67.47982214730594 58.85276076308644, 64.07619623688856 76.5210513546238, 49.13500000000001 85.10431642989678 C 34.197839864932604 93.68526288681738, 17.224945520414785 88.19944893969671, 5.386608946049633e-15 87.97 C -16.995859874251966 87.74360264955502, -33.675744430814035 92.32280785019591, -48.38499999999998 83.80527832422013 C -63.09093119233604 75.28967380919008, -67.46629494853046 58.573580703738266, -76.07167146842508 43.92000000000003 C -84.74078159210374 29.157891156391287, -97.50578376593529 17.119125303246612, -97.6 1.1952552759678167e-14 C -97.6942955026296 -17.13352843141885, -85.16966290503643 -29.388429432236997, -76.5566456945444 -44.19999999999998 C -67.96991930904315 -58.966358953746784, -62.77231119032221 -74.64857202786988, -48.62500000000004 -84.22097051803664 C -34.121978463364755 -94.03405086895964, -17.446142869940783 -97.50541642989344, -1.7634913907721887e-14 -96 C 16.824136546866306 -94.54825609504428, 29.53246273910814 -84.92008419882137, 44.00999999999994 -76.22755604110633 C 58.26564148077935 -67.66825740177873, 71.6180443525204 -60.425177429348025, 81.51031100419134 -47.060000000000045 C 92.07153193494764 -32.79101629986303, 101.4285520767086 -17.724169293174832, 100.43 0 z ;M 97.27 0 C 98.58345261039341 17.558366186082086, 94.2994917286897 34.203939932148074, 84.091066707469 48.54999999999999 C 74.21975411889315 62.42231066985079, 58.473444022898576 67.23312887448718, 43.57000000000001 75.46545368577598 C 28.941333692804605 83.54599751254223, 16.64874697133146 93.54662780123404, 5.8170722959499274e-15 95 C -17.27803955307615 96.50830704429953, -33.78857056294901 93.13333275238398, -48.19499999999998 83.47618867078205 C -62.265894952404224 74.04396533562448, -68.01933932212052 58.825944468473296, -76.14095350072783 43.96000000000003 C -84.0905443486636 29.408930041052358, -92.00739521206805 16.483816295811398, -93.8 1.1487186976002173e-14 C -95.70727280919573 -17.538240901971744, -94.76889052685837 -34.35072747684755, -86.34273275730855 -49.84999999999997 C -77.83404631199598 -65.50107770786477, -64.5344993843803 -76.3187721614444, -48.310000000000045 -83.67537451365246 C -32.817324666057125 -90.70014915251777, -17.009590728815464 -88.78959332709252, -1.6349034768617164e-14 -89 C 17.210968156731738 -89.21289768843408, 34.09370369400777 -93.47659088564015, 49.00499999999994 -84.87914982491287 C 63.91783177263862 -76.28082345658234, 68.61922431545376 -59.49398069945713, 77.12822246104209 -44.530000000000044 C 85.58365918742902 -29.660212768381562, 95.99397423560407 -17.058040356269963, 97.27 0 z ;M 102 0 C 102 17.85951467281289, 86.87204367700592 29.533206594083104, 77.94228634059948 44.99999999999999 C 69.01252900419304 60.46679340591688, 66.4667934059169 79.40483384960629, 51.000000000000014 88.33459118601273 C 35.53320659408312 97.26434852241918, 17.859514672812903 90, 5.5109105961630896e-15 90 C -17.85951467281288 90, -35.53320659408308 97.26434852241918, -50.99999999999998 88.33459118601274 C -66.46679340591687 79.4048338496063, -69.01252900419303 60.46679340591692, -77.94228634059947 45.00000000000003 C -86.87204367700592 29.533206594083133, -102 17.859514672812914, -102 1.2491397351303002e-14 C -102 -17.85951467281287, -86.87204367700593 -29.533206594083083, -77.9422863405995 -44.99999999999997 C -69.01252900419306 -60.46679340591687, -66.46679340591693 -79.40483384960628, -51.00000000000004 -88.33459118601273 C -35.53320659408315 -97.26434852241918, -17.85951467281292 -89.99999999999999, -1.6532731788489267e-14 -90 C 17.859514672812853 -90.00000000000001, 35.533206594083055 -97.26434852241921, 50.99999999999993 -88.33459118601279 C 66.46679340591683 -79.40483384960635, 69.012529004193 -60.46679340591694, 77.94228634059945 -45.00000000000004 C 86.8720436770059 -29.53320659408314, 102 -17.85951467281291, 102 0 z ;"					dur="30s" repeatCount="indefinite"></animate><animateTransform id="ratate1" attributeName="transform" type="rotate" from="90" to="450" dur="30s"					repeatCount="indefinite"></animateTransform><animateTransform id="cat1" attributeName="transform" type="scale" values="1;1.05;1.05;1.02;1" dur="0.15s"					begin="shell_avatar.mousedown" repeatCount="1" additive="sum"></animateTransform></path></g><circle cx="0" cy="0" r="76" class="sapWCShellBarCoPilotMiddle" id="shell_avatar"></circle></svg>`; };
const block7$1 = (context) => { return html`<span class="sapWCShellBarCoPilotPlaceholder"></span>		`; };
const block8$1 = (item, index, context) => { return html`${ item.src ? block9$1(item, index, context) : block10$1(item) }`; };
const block9$1 = (item, index, context) => { return html`<ui5-icon						tabindex="${ifDefined(item._tabIndex)}"						data-ui5-notification-count="${ifDefined(context.notificationCount)}"						data-ui5-external-action-item-id="${ifDefined(item.refItemid)}"						class="${ifDefined(item.classes)}"						src="${ifDefined(item.src)}"						id="${ifDefined(item.id)}"						style="${ifDefined(item.style)}"						@ui5-press=${ifDefined(item.press)}></ui5-icon>				`; };
const block10$1 = (item, index, context) => { return html`<div						tabindex="${ifDefined(item._tabIndex)}"						id="${ifDefined(item.id)}"						style="${ifDefined(item.style)}"						class="${ifDefined(item.classes)}"						@click="${ifDefined(item.press)}"					><span style="${ifDefined(item.subStyles)}" class="${ifDefined(item.subclasses)}"></span></div>				`; };
const block11$1 = (item, index, context) => { return html`<ui5-li					data-ui5-external-action-item-id="${ifDefined(item.refItemid)}" 					icon="${ifDefined(item.src)}"					type="Active"					@ui5-_press="${ifDefined(item.press)}"				>${ifDefined(item.text)}</ui5-li>			`; };
const block12$1 = (context) => { return html`<slot name="searchField"></slot>		`; };

var styles$3 = ":host(ui5-shellbar:not([hidden])){display:inline-block;width:100%}ui5-shellbar:not([hidden]){display:inline-block;width:100%}.sapWCShellBarWrapper{position:relative;display:flex;justify-content:space-between;align-items:center;background:var(--sapUiShellColor,var(--sapShellColor,var(--sapPrimary1,#354a5f)));height:2.75rem;font-family:var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif));font-size:var(--sapMFontMediumSize,.875rem);font-weight:400;box-sizing:border-box}.sapWCShellBarIconButton,.sapWCShellBarImageButton,.sapWCShellBarMenuButton,::slotted(ui5-icon){height:2.25rem;padding:0;margin-left:.5rem;border:none;outline:none;background:transparent;color:var(--sapUiShellTextColor,var(--sapShell_TextColor,#fff));box-sizing:border-box;cursor:pointer;border-radius:.25rem;position:relative;font-size:.75rem;font-weight:700}.sapWCShellBarIconButton:hover,.sapWCShellBarImageButton:hover,.sapWCShellBarMenuButton.sapWCShellBarMenuButtonInteractive:hover{background:var(--sapUiShellHoverBackground,#283848)}.sapWCShellBarIconButton:active,.sapWCShellBarImageButton:active,.sapWCShellBarMenuButton.sapWCShellBarMenuButtonInteractive:active{background:var(--sapUiShellActiveBackground,#23303e);color:var(--sapUiShellActiveTextColor,#fff)}.sapWCShellBarIconButton:focus:after,.sapWCShellBarImageButton:focus:after,.sapWCShellBarMenuButton.sapWCShellBarMenuButtonInteractive:focus:after{content:\"\";position:absolute;width:calc(100% - .375rem);height:calc(100% - .375rem);border:1px dotted var(--sapUiContentContrastFocusColor,var(--sapContent_ContrastFocusColor,#fff));pointer-events:none;left:2px;top:2px;z-index:1}.sapWCShellBarMenuButton.sapWCShellBarMenuButtonInteractive::-moz-focus-inner{border:none}.sapWCShellBarMenuButtonTitle{display:inline-block;font-family:var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif));margin:0;font-size:.75rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:auto}.sapWCShellBarMenuButtonNoTitle{min-width:2.25rem;justify-content:center}.sapWCShellBarMenuButtonNoTitle span{margin-left:0}.sapWCShellBarMenuButtonMerged span{margin-left:.5rem}.sapWCShellBarSecondaryTitle{display:inline-block;margin:0 .5rem;font-size:var(--sapMFontSmallSize,.75rem);color:var(--sapUiShellTextColor,var(--sapShell_TextColor,#fff));line-height:1rem;font-weight:400;text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.sapWCShellBarMenuButtonInteractive .sapWCShellBarMenuButtonArrow{display:inline-block;margin-left:.5rem;width:10px;height:10px;width:0;height:0;color:var(--sapUiShellInteractiveTextColor,var(--sapShell_InteractiveTextColor,#d1e8ff));border-left:5px solid transparent;border-right:5px solid transparent;border-top:5px solid var(--sapUiShellTextColor,var(--sapShell_TextColor,#fff))}.sapWCShellBarOverflowContainer{display:flex;justify-content:center;align-items:center;height:100%;overflow:hidden}.sapWCShellBarCoPilot{width:50px;height:30px}.sapWCShellBarCoPilotBehindLayer{animation:Behind_layer 9s linear;animation-iteration-count:infinite;transform-origin:center}.sapWCShellBarOverflowContainerMiddle{align-self:center;height:2.5rem;width:3rem;flex-shrink:0}@keyframes Behind_layer{0%{transform:rotate(1turn)}}.sapWCShellBarCoPilotTopLayer{animation:Top_layer 9s linear;animation-iteration-count:infinite;transform-origin:center}@keyframes Top_layer{0%{transform:rotate(-1turn)}}.sapWCShellBarSizeS{padding:.25rem 1rem}.sapWCShellBarSizeS ::slotted(ui5-icon){margin-right:0}.sapWCShellBarSizeS .sapWCShellBarSearchField{width:200px}.sapWCShellBarSizeM{padding:.25rem 2rem}.sapWCShellBarSizeL{padding:.25rem 2rem}.sapWCShellBarSizeXL{padding:.25rem 3rem}.sapWCShellBarSizeXXL{padding:.25rem 3rem}.sapWCShellBarLogo{cursor:pointer;height:1.675rem}.sapWCShellBarLogo:not([src]){display:none}.sapWCShellBarIconButton{min-width:2.25rem;font-size:1rem}.sapWCShellBarImageButtonImage{border-radius:50%;width:1.75rem;height:1.75rem;display:flex;background-size:cover}.sapWCShellBarImageButton{display:flex;justify-content:center;align-items:center;min-width:2.25rem;height:2.25rem;display:inline-flex}.sapWCShellBarOverflowContainerLeft{flex-basis:50%;max-width:calc(50% - 1.5rem);justify-content:flex-start;margin-right:.5rem}.sapWCShellBarMenuButton{white-space:nowrap;overflow:hidden;display:flex;align-items:center;padding:.25rem .5rem;cursor:text;-webkit-user-select:text;-moz-user-select:text;-ms-user-select:text;user-select:text}.sapWCShellBarMenuButton.sapWCShellBarMenuButtonInteractive{-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;cursor:pointer}.sapWCShellBarMenuButton.sapWCShellBarMenuButtonNoLogo{margin-left:0}.sapWCShellBarOverflowContainerRight{display:block;overflow:hidden;box-sizing:border-box;white-space:nowrap;margin-left:8rem;flex:1}.sapWCShellBarOverflowContainerRight .sapWCShellBarOverflowContainerRightChild{display:flex;float:right}.sapWCShellBarOverflowIcon{display:none}.sapWCShellBarSizeM .sapWCShellBarSecondaryTitle{display:none}.sapWCShellBarSizeS .sapWCShellBarSecondaryTitle{display:none}.sapWCShellBarSizeS .sapWCShellBarMenuButtonTitle{display:none}.sapWCShellBarSizeS .sapWCShellBarOverflowContainerRight{margin-left:0}.sapWCOverflowButtonShown{display:inline-block}.sapWCShellBarHiddenIcon,.sapWCShellBarUnsetIcon{visibility:hidden}.svg-box-content{width:40px;height:30px}.sapWCShellBarSearchFieldHidden{display:none}.sapWCShellBarHasSearchField.sapWCShellBarSizeL .sapWCShellBarOverflowContainerRight{margin-left:1rem}.sapWCShellBarHasSearchField.sapWCShellBarSizeXL .sapWCShellBarOverflowContainerRight{margin-left:1rem}.sapWCShellBarHasNotifications .sapWCShellBarBellIcon{position:relative}.sapWCShellBarHasNotifications .sapWCShellBarBellIcon:before{content:attr(data-ui5-notification-count);position:absolute;width:auto;height:1rem;min-width:1rem;background:var(--sapUiContentBadgeBackground,var(--sapContent_BadgeBackground,#ab2b2b));color:var(--sapUiShellTextColor,var(--sapShell_TextColor,#fff));top:.125rem;left:1.5rem;padding:.25rem;border-radius:1rem;display:flex;justify-content:center;align-items:center;font-size:var(--sapMFontSmallSize,.75rem);font-family:var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif));z-index:2;box-sizing:border-box}.sapWCShellBarMenuButton{margin-left:.5rem}.sapWCShellBarBlockLayer{top:0;left:0;right:0;bottom:0;position:fixed;outline:0 none;z-index:100}.sapWCShellBarBlockLayerHidden{display:none}.sapWCShellBarSearchField{z-index:101;position:absolute;width:240px;top:.25rem}.sapWCShellBarBlockLayerShown .sapWCShellBarSearchIcon{background:var(--sapUiHighlight,var(--sapHighlightColor,#0854a0));color:var(--sapUiShellActiveTextColor,#fff);border-top-left-radius:0;border-bottom-left-radius:0}.sapWCShellBarCoPilotPlaceholder{width:2.75rem;height:2.75rem}.sapWCShellBarCoPilotMiddle{fill:var(--sapUiShellColor,var(--sapShellColor,var(--sapPrimary1,#354a5f)))}.sapWCShellBarCoPilotWrapper{background:var(--sapUiShellColor,var(--sapShellColor,var(--sapPrimary1,#354a5f)))}[dir=rtl] ::slotted(ui5-icon){margin-left:.5rem;margin-right:0}[dir=rtl] .sapWCShellBarMenuButton{margin-right:.5rem;margin-left:0}[dir=rtl] .sapWCShellBarMenuButtonInteractive .sapWCShellBarMenuButtonArrow{margin-right:.5rem;margin-left:0}[dir=rtl] .sapWCShellBarOverflowContainerRight{margin-right:8rem;margin-left:0}[dir=rtl] .sapWCShellBarOverflowContainerRight .sapWCShellBarOverflowContainerRightChild{float:left}[dir=rtl] .sapWCShellBarSizeS .sapWCShellBarOverflowContainerRight{margin-right:0}::slotted(ui5-icon){width:2.25rem;height:2.25rem;margin-right:.5rem;margin-left:0;display:flex;justify-content:center;align-items:center}::slotted(ui5-icon:hover){background:var(--sapUiShellHoverBackground,#283848)}::slotted(ui5-icon:active){background:var(--sapUiShellActiveBackground,#23303e);color:var(--sapUiShellActiveTextColor,#fff)}::slotted(ui5-icon:focus):after{content:\"\";position:absolute;width:calc(100% - .375rem);height:calc(100% - .375rem);border:1px dotted var(--sapUiContentContrastFocusColor,var(--sapContent_ContrastFocusColor,#fff));pointer-events:none;left:2px;top:2px;z-index:1}";

/**
 * @public
 */
const metadata$c = {
	tag: "ui5-shellbar",
	properties: /** @lends  sap.ui.webcomponents.main.ShellBar.prototype */ {

		/**
		 * Defines the <code>logo</code> source URI.
		 * @type {string}
		 * @public
		 */
		logo: {
			type: String,
		},

		/**
		 * Defines the <code>primaryTitle</code>.
		 * @type {string}
		 * @defaultvalue: ""
		 * @public
		 */
		primaryTitle: {
			type: String,
		},

		/**
		 * Defines the <code>secondaryTitle</code>.
		 * <br><br>
		 * <b>Note:</b> On smaller screen width, the <code>secondaryTitle</code> would be hidden.
		 * @type {string}
		 * @defaultvalue: ""
		 * @public
		 */
		secondaryTitle: {
			type: String,
		},

		/**
		 * Defines the <code>notificationCount</code>,
		 * displayed in the notification icon top-right corner.
		 * @type {string}
		 * @defaultvalue: ""
		 * @public
		 */
		notificationCount: {
			type: String,
		},

		/**
		 * Defines the source URI of the profile action.
		 * If no source is set - profile will be excluded from actions.
		 * @type {string}
		 * @public
		 */
		profile: {
			type: String,
		},

		/**
		 * Defines, if the notification icon would be displayed.
		 * @type {boolean}
		 * @public
		 */
		showNotifications: {
			type: Boolean,
		},

		/**
		 * Defines, if the product switch icon would be displayed.
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		showProductSwitch: {
			type: Boolean,
		},

		/**
		 * Defines, if the product CoPilot icon would be displayed.
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		showCoPilot: {
			type: Boolean,
		},

		_breakpointSize: {
			type: String,
		},

		_itemsInfo: {
			type: Object,
			deepEqual: true,
		},

		_actionList: {
			type: Object,
		},

		_showBlockLayer: {
			type: Boolean,
		},
		_searchField: {
			type: Object,
		},

		_header: {
			type: Object,
		},
	},

	slots: /** @lends  sap.ui.webcomponents.main.ShellBar.prototype */ {
		/**
		 * Defines the <code>ui5-shellbar</code> aditional items.
		 * </br></br>
		 * <b>Note:</b>
		 * You can use the &nbsp;&lt;ui5-shellbar-item>&lt;/ui5-shellbar-item>.
		 *
		 * @type {HTMLElement[]}
		 * @slot
		 * @public
		 */
		"default": {
			propertyName: "items",
			type: HTMLElement,
		},

		/**
		 * Defines the items displayed in menu after a click on the primary title.
		 * </br></br>
		 * <b>Note:</b>
		 * You can use the &nbsp;&lt;ui5-li>&lt;/ui5-li> and its ancestors.
		 *
		 * @type {HTMLElement[]}
		 * @slot
		 * @since 0.10
		 * @public
		 */
		menuItems: {
			type: HTMLElement,
		},

		/**
		 * Defines the <code>ui5-input</code>, that will be used as a search field.
		 *
		 * @type {HTMLElement[]}
		 * @slot
		 * @public
		 */
		searchField: {
			type: HTMLElement,
		},

		/**
		 * Defines a <code>ui5-icon</code> in the bar that will be placed in the beginning.
		 *
		 * @type {HTMLElement[]}
		 * @slot
		 * @public
		 */
		icon: {
			type: HTMLElement,
		},
	},
	events: /** @lends sap.ui.webcomponents.main.ShellBar.prototype */ {
		/**
		 *
		 * Fired, when the notification icon is activated.
		 *
		 *
		 * @event
		 * @param {HTMLElement} targetRef dom ref of the activated element
		 * @public
		 */
		notificationsClick: {
			detail: {
				targetRef: { type: HTMLElement },
			},
		},

		/**
		 * Fired, when the profile icon is activated.
		 *
		 * @event
		 * @param {HTMLElement} targetRef dom ref of the activated element
		 * @public
		 */
		profileClick: {
			detail: {
				targetRef: { type: HTMLElement },
			},
		},

		/**
		 * Fired, when the product switch icon is activated.
		 *
		 * @event
		 * @param {HTMLElement} targetRef dom ref of the activated element
		 * @public
		 */
		productSwitchClick: {
			detail: {
				targetRef: { type: HTMLElement },
			},
		},

		/**
		 * Fired, when the logo is activated.
		 *
		 * @event
		 * @param {HTMLElement} targetRef dom ref of the activated element
		 * @since 0.10
		 * @public
		 */
		logoClick: {
			detail: {
				targetRef: { type: HTMLElement },
			},
		},

		/**
		 * Fired, when the co pilot is activated.
		 *
		 * @event
		 * @param {HTMLElement} targetRef dom ref of the activated element
		 * @since 0.10
		 * @public
		 */
		coPilotClick: {
			detail: {
				targetRef: { type: HTMLElement },
			},
		},

		/**
		 * Fired, when a menu item is activated
		 *
		 * @event
		 * @param {HTMLElement} item dom ref of the activated list item
		 * @since 0.10
		 * @public
		 */
		menuItemClick: {
			detail: {
				item: { type: HTMLElement },
			},
		},
	},
};

/**
 * @class
 * <h3 class="comment-api-title">Overview</h3>
 *
 * The <code>ui5-shellbar</code> is meant to serve as an application header
 * and includes numerous built-in features, such as: logo, profile icon, title, search field, notifications and so on.
 * <br><br>
 * <h3>ES6 Module Import</h3>
 * <code>import "@ui5/webcomponents/dist/ShellBar";</code>
 *
 * @constructor
 * @author SAP SE
 * @alias sap.ui.webcomponents.main.ShellBar
 * @extends sap.ui.webcomponents.base.UI5Element
 * @tagname ui5-shellbar
 * @appenddocs ShellBarItem
 * @public
 * @since 0.8.0
 */
class ShellBar extends UI5Element {
	static get metadata() {
		return metadata$c;
	}

	static get styles() {
		return styles$3;
	}

	static get render() {
		return litRender;
	}

	static get template() {
		return block0$8;
	}

	static get FIORI_3_BREAKPOINTS() {
		return [
			559,
			1023,
			1439,
			1919,
			10000,
		];
	}

	static get FIORI_3_BREAKPOINTS_MAP() {
		return {
			"559": "S",
			"1023": "M",
			"1439": "L",
			"1919": "XL",
			"10000": "XXL",
		};
	}

	constructor() {
		super();

		this._itemsInfo = [];
		this._isInitialRendering = true;
		this._focussedItem = null;

		// marks if preventDefault() is called in item's press handler
		this._defaultItemPressPrevented = false;

		const that = this;

		this._actionList = {
			itemPress: event => {
				const popover = this.shadowRoot.querySelector(".sapWCShellBarOverflowPopover");

				if (!this._defaultItemPressPrevented) {
					popover.close();
				}

				this._defaultItemPressPrevented = false;
			},
		};

		this._header = {
			press: event => {
				const menuPopover = this.shadowRoot.querySelector(".sapWCShellBarMenuPopover");

				if (this.menuItems.length) {
					menuPopover.openBy(this.shadowRoot.querySelector(".sapWCShellBarMenuButton"));
				}
			},
		};

		this._itemNav = new ItemNavigation(this);

		this._itemNav.getItemsCallback = () => {
			const items = that._itemsInfo.filter(info => {
				const isVisible = info.classes.indexOf("sapWCShellBarHiddenIcon") === -1;
				const isSet = info.classes.indexOf("sapWCShellBarUnsetIcon") === -1;

				if (isVisible && isSet) {
					return true;
				}

				return false;
			}).sort((item1, item2) => {
				if (item1.domOrder < item2.domOrder) {
					return -1;
				}

				if (item1.domOrder > item2.domOrder) {
					return 1;
				}

				return 0;
			});

			this._itemNav.rowSize = items.length;

			return items.map(item => {
				const clone = JSON.parse(JSON.stringify(item));
				clone.press = item.press;

				return clone;
			});
		};

		this._itemNav.setItemsCallback = items => {
			const newItems = that._itemsInfo.map(stateItem => {
				const mappingItem = items.filter(item => {
					return item.id === stateItem.id;
				})[0];

				const clone = JSON.parse(JSON.stringify(stateItem));
				clone._tabIndex = mappingItem ? mappingItem._tabIndex : "-1";
				clone.press = stateItem.press;

				return clone;
			});

			that._itemsInfo = newItems;
		};

		this._delegates.push(this._itemNav);

		this._searchField = {
			left: 0,
			focusout: event => {
				this._showBlockLayer = false;
			},
		};

		this._handleResize = event => {
			this.shadowRoot.querySelector(".sapWCShellBarOverflowPopover").close();
			this._overflowActions();
		};
	}

	_menuItemPress(event) {
		this.fireEvent("menuItemClick", {
			item: event.detail.item,
		});
	}

	_logoPress(event) {
		this.fireEvent("logoClick", {
			targetRef: this.shadowRoot.querySelector(".sapWCShellBarLogo"),
		});
	}

	_coPilotPress(event) {
		this.fireEvent("coPilotClick", {
			targetRef: this.shadowRoot.querySelector(".ui5-shellbar-coPilot"),
		});
	}

	onBeforeRendering() {
		const size = this._handleBarBreakpoints();
		if (size !== "S") {
			this._itemNav.init();
		}

		this._hiddenIcons = this._itemsInfo.filter(info => {
			const isHidden = (info.classes.indexOf("sapWCShellBarHiddenIcon") !== -1);
			const isSet = info.classes.indexOf("sapWCShellBarUnsetIcon") === -1;
			const isOverflowIcon = info.classes.indexOf("sapWCShellBarOverflowIcon") !== -1;

			return isHidden && isSet && !isOverflowIcon;
		});
	}

	onAfterRendering() {
		this._overflowActions();

		if (this._focussedItem) {
			this._focussedItem._tabIndex = "0";
		}
	}

	/**
	 * Closes the overflow area.
	 * Useful to manually close the overflow after having suppressed automatic closing with preventDefault() of ShellbarItem's press event
	 * @public
	 */
	closeOverflow() {
		const popover = this.shadowRoot.querySelector(".sapWCShellBarOverflowPopover");

		if (popover) {
			popover.close();
		}
	}

	_handleBarBreakpoints() {
		const width = this.getBoundingClientRect().width;
		const breakpoints = ShellBar.FIORI_3_BREAKPOINTS;

		const size = breakpoints.filter(bp1 => width < bp1)[0] || ShellBar.FIORI_3_BREAKPOINTS[ShellBar.FIORI_3_BREAKPOINTS.length - 1];
		const mappedSize = ShellBar.FIORI_3_BREAKPOINTS_MAP[size];

		if (this._breakpointSize !== mappedSize) {
			this._breakpointSize = mappedSize;
		}

		return mappedSize;
	}

	_handleSizeS() {
		const hasIcons = this.showNotifications || this.showProductSwitch || this.searchField.length || this.items.length;

		this._itemsInfo = this._getAllItems(hasIcons).map(info => {
			const isOverflowIcon = info.classes.indexOf("sapWCShellBarOverflowIcon") !== -1;
			const isImageIcon = info.classes.indexOf("sapWCShellBarImageButton") !== -1;
			const shouldStayOnScreen = isOverflowIcon || (isImageIcon && this.profile);

			return Object.assign({}, info, {
				classes: `${info.classes} ${shouldStayOnScreen ? "" : "sapWCShellBarHiddenIcon"} sapWCShellBarIconButton`,
				style: `order: ${shouldStayOnScreen ? 1 : -1}`,
			});
		});
	}

	_handleActionsOverflow() {
		const rightContainerRect = this.shadowRoot.querySelector(".sapWCShellBarOverflowContainerRight").getBoundingClientRect();
		const icons = this.shadowRoot.querySelectorAll(".sapWCShellBarIconButton:not(.sapWCShellBarOverflowIcon):not(.sapWCShellBarUnsetIcon)");
		const isRTL = getRTL();

		let overflowCount = [].filter.call(icons, icon => {
			const iconRect = icon.getBoundingClientRect();

			if (isRTL) {
				return (iconRect.left + iconRect.width) > (rightContainerRect.left + rightContainerRect.width);
			}

			return iconRect.left < rightContainerRect.left;
		});

		overflowCount = overflowCount.length;

		const items = this._getAllItems(!!overflowCount);

		items.map(item => {
			this._itemsInfo.forEach(stateItem => {
				if (stateItem.id === item.id) {
					item._tabIndex = stateItem._tabIndex;
				}
			});

			return item;
		});

		const itemsByPriority = items.sort((item1, item2) => {
			if (item1.priority > item2.priority) {
				return 1;
			}

			if (item1.priority < item2.priority) {
				return -1;
			}

			return 0;
		});

		const focusableItems = [];

		for (let i = 0; i < itemsByPriority.length; i++) {
			if (i < overflowCount) {
				itemsByPriority[i].classes = `${itemsByPriority[i].classes} sapWCShellBarHiddenIcon`;
				itemsByPriority[i].style = `order: -1`;
			} else {
				focusableItems.push(itemsByPriority[i]);
			}
		}

		this._focussedItem = this._findInitiallyFocussedItem(focusableItems);

		return itemsByPriority;
	}

	_findInitiallyFocussedItem(items) {
		items.sort((item1, item2) => {
			const order1 = parseInt(item1.style.split("order: ")[1]);
			const order2 = parseInt(item2.style.split("order: ")[1]);

			if (order1 === order2) {
				return 0;
			}

			if (order1 < order2) {
				return -1;
			}

			return 1;
		});

		const focusedItem = items.filter(item => {
			return (item.classes.indexOf("sapWCShellBarUnsetIcon") === -1)
				&& (item.classes.indexOf("sapWCShellBarOverflowIcon") === -1)
				&& (item.classes.indexOf("sapWCShellBarHiddenIcon") === -1);
		})[0];

		return focusedItem;
	}

	_overflowActions() {
		const size = this._handleBarBreakpoints();

		if (size === "S") {
			return this._handleSizeS();
		}

		const items = this._handleActionsOverflow();
		this._itemsInfo = items;
	}

	_toggleActionPopover() {
		const popover = this.shadowRoot.querySelector(".sapWCShellBarOverflowPopover");
		const overflowButton = this.shadowRoot.querySelector(".sapWCShellBarOverflowIcon");
		popover.openBy(overflowButton);
	}

	onkeydown(event) {
		if (isEscape(event)) {
			return this._handleEscape(event);
		}

		if (isSpace(event)) {
			event.preventDefault();
		}
	}

	_handleEscape() {
		const searchButton = this.shadowRoot.querySelector(".sapWCShellBarSearchIcon");

		if (this._showBlockLayer) {
			this._showBlockLayer = false;

			setTimeout(() => {
				searchButton.focus();
			}, 0);
		}
	}

	onEnterDOM() {
		ResizeHandler.register(this, this._handleResize);
	}

	onExitDOM() {
		ResizeHandler.deregister(this, this._handleResize);
	}

	_handleSearchIconPress(event) {
		const searchField = this.shadowRoot.querySelector(`#${this._id}-searchfield-wrapper`);
		const triggeredByOverflow = event.target.tagName.toLowerCase() === "ui5-li";
		const overflowButton = this.shadowRoot.querySelector(".sapWCShellBarOverflowIcon");
		const overflowButtonRect = overflowButton.getBoundingClientRect();
		const isRTL = getRTL();
		let right = "";

		if (isRTL) {
			right = `${(triggeredByOverflow ? overflowButton.offsetLeft : event.target.offsetLeft) + overflowButtonRect.width}px`;
		} else {
			right = `calc(100% - ${triggeredByOverflow ? overflowButton.offsetLeft : event.target.offsetLeft}px)`;
		}

		this._searchField = Object.assign({}, this._searchField, {
			"right": right,
		});

		this._showBlockLayer = true;

		setTimeout(() => {
			const inputSlot = searchField.children[0];

			if (inputSlot) {
				inputSlot.assignedNodes()[0].focus();
			}
		}, 100);
	}

	_handleCustomActionPress(event) {
		const refItemId = event.target.getAttribute("data-ui5-external-action-item-id");
		const actions = this.shadowRoot.querySelectorAll(".sapWCShellBarItemCustomAction");
		let elementIndex = [].indexOf.apply(actions, [event.target]);

		if (this.searchField.length) {
			elementIndex += 1;
		}

		this._itemNav.currentIndex = elementIndex;

		if (refItemId) {
			const shellbarItem = this.items.filter(item => {
				return item.shadowRoot.querySelector(`#${refItemId}`);
			})[0];

			const prevented = !shellbarItem.fireEvent("itemClick", { targetRef: event.target }, true);

			this._defaultItemPressPrevented = prevented;
		}
	}

	_handleOverflowPress(event) {
		this._toggleActionPopover();
	}

	_handleNotificationsPress(event) {
		this.fireEvent("notificationsClick", {
			targetRef: this.shadowRoot.querySelector(".sapWCShellBarBellIcon"),
		});
	}

	_handleProfilePress(event) {
		this.fireEvent("profileClick", {
			targetRef: this.shadowRoot.querySelector(".sapWCShellBarImageButton"),
		});
	}

	_handleProductSwitchPress(event) {
		this.fireEvent("productSwitchClick", {
			targetRef: this.shadowRoot.querySelector(".sapWCShellBarIconProductSwitch"),
		});
	}

	/**
	 * Returns all items that will be placed in the right of the bar as icons / dom elements.
	 * @param {Boolean} showOverflowButton Determines if overflow button should be visible (not overflowing)
	 */
	_getAllItems(showOverflowButton) {
		let domOrder = -1;

		const items = [
			{
				src: "sap-icon://search",
				text: "Search",
				classes: `${this.searchField.length ? "" : "sapWCShellBarUnsetIcon"} sapWCShellBarSearchIcon sapWCShellBarIconButton`,
				priority: 4,
				domOrder: this.searchField.length ? (++domOrder) : -1,
				style: `order: ${this.searchField.length ? 1 : -10}`,
				id: `${this._id}-item-${1}`,
				press: this._handleSearchIconPress.bind(this),
				_tabIndex: "-1",
			},
			...this.items.map((item, index) => {
				return {
					src: item.src,
					id: item._id,
					refItemid: item._id,
					text: item.text,
					classes: "sapWCShellBarItemCustomAction sapWCShellBarIconButton",
					priority: 1,
					domOrder: (++domOrder),
					style: `order: ${2}`,
					show: true,
					press: this._handleCustomActionPress.bind(this),
					_tabIndex: "-1",
				};
			}),
			{
				src: "sap-icon://bell",
				text: "Notifications",
				classes: `${this.showNotifications ? "" : "sapWCShellBarUnsetIcon"} sapWCShellBarBellIcon sapWCShellBarIconButton`,
				priority: 3,
				style: `order: ${this.showNotifications ? 3 : -10}`,
				id: `${this._id}-item-${2}`,
				show: this.showNotifications,
				domOrder: this.showNotifications ? (++domOrder) : -1,
				press: this._handleNotificationsPress.bind(this),
				_tabIndex: "-1",
			},
			{
				src: "sap-icon://overflow",
				text: "Overflow",
				classes: `${showOverflowButton ? "" : "sapWCShellBarHiddenIcon"} sapWCOverflowButtonShown sapWCShellBarOverflowIcon sapWCShellBarIconButton`,
				priority: 5,
				order: 4,
				style: `order: ${showOverflowButton ? 4 : -1}`,
				domOrder: showOverflowButton ? (++domOrder) : -1,
				id: `${this.id}-item-${5}`,
				press: this._handleOverflowPress.bind(this),
				_tabIndex: "-1",
				show: true,
			},
			{
				text: "Person",
				classes: `${this.profile ? "" : "sapWCShellBarUnsetIcon"} sapWCShellBarImageButton sapWCShellBarIconButton`,
				priority: 4,
				subclasses: "sapWCShellBarImageButtonImage",
				style: `order: ${this.profile ? 5 : -10};`,
				subStyles: `${this.profile ? `background-image: url(${this.profile})` : ""}`,
				id: `${this._id}-item-${3}`,
				domOrder: this.profile ? (++domOrder) : -1,
				show: this.profile,
				press: this._handleProfilePress.bind(this),
				_tabIndex: "-1",
			},
			{
				src: "sap-icon://grid",
				text: "Product Switch",
				classes: `${this.showProductSwitch ? "" : "sapWCShellBarUnsetIcon"} sapWCShellBarIconButton sapWCShellBarIconProductSwitch`,
				priority: 2,
				style: `order: ${this.showProductSwitch ? 6 : -10}`,
				id: `${this._id}-item-${4}`,
				show: this.showProductSwitch,
				domOrder: this.showProductSwitch ? (++domOrder) : -1,
				press: this._handleProductSwitchPress.bind(this),
				_tabIndex: "-1",
			},
		];
		return items;
	}

	get classes() {
		return {
			wrapper: {
				"sapWCShellBarWrapper": true,
				[`sapWCShellBarSize${this._breakpointSize}`]: true,
				"sapWCShellBarHasSearchField": this.searchField.length,
				"sapWCShellBarBlockLayerShown": this._showBlockLayer,
				"sapWCShellBarHasNotifications": !!this.notificationCount,
			},
			leftContainer: {
				"sapWCShellBarOverflowContainer": true,
				"sapWCShellBarOverflowContainerLeft": true,
			},
			logo: {
				"sapWCShellBarLogo": true,
			},
			button: {
				"sapWCShellBarMenuButtonNoTitle": !this.primaryTitle,
				"sapWCShellBarMenuButtonNoLogo": !this.logo,
				"sapWCShellBarMenuButtonMerged": this._breakpointSize === "S",
				"sapWCShellBarMenuButtonInteractive": !!this.menuItems.length,
				"sapWCShellBarMenuButton": true,
			},
			buttonTitle: {
				"sapWCShellBarMenuButtonTitle": true,
			},
			secondaryTitle: {
				"sapWCShellBarSecondaryTitle": true,
			},
			arrow: {
				"sapWCShellBarMenuButtonArrow": true,
			},
			searchField: {
				"sapWCShellBarSearchField": true,
				"sapWCShellBarSearchFieldHidden": !this._showBlockLayer,
			},
			blockLayer: {
				"sapWCShellBarBlockLayer": true,
				"sapWCShellBarBlockLayerHidden": !this._showBlockLayer,
			},
		};
	}

	get styles() {
		return {
			searchField: {
				[getRTL() ? "left" : "right"]: this._searchField.right,
				"top": `${parseInt(this._searchField.top)}px`,
			},
		};
	}

	get interactiveLogo() {
		return this._breakpointSize === "S";
	}

	get showArrowDown() {
		return this.primaryTitle || (this.logo && this.interactiveLogo);
	}

	get popoverHorizontalAlign() {
		return getRTL() ? "Left" : "Right";
	}

	get rtl() {
		return getEffectiveRTL() ? "rtl" : undefined;
	}

	static async define(...params) {
		await Promise.all([
			Icon.define(),
			List.define(),
			Popover.define(),
			StandardListItem.define(),
		]);

		super.define(...params);
	}
}

ShellBar.define();

customElements.define('my-gh-header', MyHeader);
