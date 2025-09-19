/**
 * PlainTextEditor - ContentEditable editor with robust line-based indentation
 */
export class PlainTextEditor {
    constructor(indentString = "    ", maxHistory = 100) {
        this.indentString = indentString;
        this.maxHistory = maxHistory;

        this.editor = null;
        this.isInitialized = false;

        this.undoStack = [];
        this.redoStack = [];
        this.lastState = "";

        this._bindHandlers();
    }

    _bindHandlers() {
        this.onInput = this.onInput.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onPaste = this.onPaste.bind(this);
    }

    // -------------------------
    // Initialization
    // -------------------------
    initialize(targetElement) {
        if (this.isInitialized) return;

        this.editor = targetElement;
        this.editor.contentEditable = "true";
        this.editor.style.whiteSpace = "pre-wrap";
        this.editor.style.outline = "none";

        this.lastState = this.editor.textContent || "";
        this.undoStack.push({ content: this.lastState, selection: this._getSelectionOffsets() });

        this.editor.addEventListener("input", this.onInput);
        this.editor.addEventListener("keydown", this.onKeyDown);
        this.editor.addEventListener("paste", this.onPaste);

        this.editor.focus();
        this.isInitialized = true;
    }

    destroy() {
        if (!this.isInitialized) return;

        this.editor.removeEventListener("input", this.onInput);
        this.editor.removeEventListener("keydown", this.onKeyDown);
        this.editor.removeEventListener("paste", this.onPaste);

        this.editor.contentEditable = "false";
        this.editor = null;
        this.isInitialized = false;
    }

    // -------------------------
    // Selection Helpers
    // -------------------------
    _getSelectionOffsets() {
        const sel = window.getSelection();
        if (!sel.rangeCount) return { start: 0, end: 0, collapsed: true };

        const range = sel.getRangeAt(0);
        const preStart = range.cloneRange();
        preStart.selectNodeContents(this.editor);
        preStart.setEnd(range.startContainer, range.startOffset);
        const start = preStart.toString().length;

        const preEnd = range.cloneRange();
        preEnd.selectNodeContents(this.editor);
        preEnd.setEnd(range.endContainer, range.endOffset);
        const end = preEnd.toString().length;

        return { start, end, collapsed: range.collapsed };
    }

    _restoreSelection({ start, end, collapsed }) {
        const sel = window.getSelection();
        sel.removeAllRanges();

        const walker = document.createTreeWalker(this.editor, NodeFilter.SHOW_TEXT);
        let pos = 0, node;
        let range = document.createRange();

        while ((node = walker.nextNode())) {
            const len = node.textContent.length;

            if (start >= pos && start <= pos + len) range.setStart(node, start - pos);
            if (end >= pos && end <= pos + len) range.setEnd(node, end - pos);

            pos += len;
        }

        sel.addRange(range);
        if (collapsed) sel.collapseToStart();
    }

    // -------------------------
    // Undo / Redo
    // -------------------------
    saveState() {
        const content = this.editor.textContent;
        const selection = this._getSelectionOffsets();
        if (content === this.lastState) return;

        this.undoStack.push({ content, selection });
        if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
        this.redoStack = [];
        this.lastState = content;
    }

    undo() {
        if (this.undoStack.length <= 1) return;

        this.redoStack.push({ content: this.editor.textContent, selection: this._getSelectionOffsets() });
        this.undoStack.pop();
        const prev = this.undoStack[this.undoStack.length - 1];

        this.editor.textContent = prev.content;
        this.lastState = prev.content;
        setTimeout(() => this._restoreSelection(prev.selection), 0);
    }

    redo() {
        if (!this.redoStack.length) return;

        const next = this.redoStack.pop();
        this.undoStack.push({ content: this.editor.textContent, selection: this._getSelectionOffsets() });

        this.editor.textContent = next.content;
        this.lastState = next.content;
        setTimeout(() => this._restoreSelection(next.selection), 0);
    }

    // -------------------------
    // Input / Key Handling
    // -------------------------
    onInput() {
        clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => this.saveState(), 300);
    }

    onPaste(e) {
        e.preventDefault();
        this.saveState();
        const text = e.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
    }

onKeyDown(e) {
    if (["Enter", "Backspace", "Delete"].includes(e.key)) this.saveState();

    const key = e.key.toLowerCase();

    // Undo
    if (e.ctrlKey && key === "z" && !e.shiftKey) {
        e.preventDefault();
        this.undo();
    } 
    // Redo
    else if (e.ctrlKey && key === "y") {
        e.preventDefault();
        this.redo();
    } 
    // Indent / Unindent
    else if (key === "tab") {
        e.preventDefault();
        const sel = this._getSelectionOffsets();

        if (sel.collapsed) {
            // No selection
            if (e.shiftKey) {
                // Unindent current line
                const lines = this.editor.textContent.split("\n");
                let charCount = 0;
                for (let i = 0; i < lines.length; i++) {
                    const lineStart = charCount;
                    const lineEnd = charCount + lines[i].length;
                    if (sel.start >= lineStart && sel.start <= lineEnd) {
                        if (lines[i].startsWith(this.indentString)) {
                            lines[i] = lines[i].slice(this.indentString.length);
                            const newCursor = sel.start - this.indentString.length;
                            this.editor.textContent = lines.join("\n");
                            this._restoreSelection({ start: newCursor, end: newCursor, collapsed: true });
                        }
                        break;
                    }
                    charCount += lines[i].length + 1;
                }
            } else {
                // Insert indent string at cursor
                document.execCommand("insertText", false, this.indentString);
            }
        } else {
            // Selection exists → modifyIndent handles multi-line
            this.modifyIndent(!e.shiftKey);
        }
    } 
    // Spellcheck toggle
    else if (e.ctrlKey && key === "m") {
        e.preventDefault();
        this.toggleSpellCheck();
    }
}



    // -------------------------
    // Indentation
    // -------------------------
modifyIndent(indent = true) {
    this.saveState();

    let { start, end, collapsed } = this._getSelectionOffsets();

    // Track if selection was reversed
    let reversed = false;
    if (start > end) {
        [start, end] = [end, start];
        reversed = true;
    }

    const lines = this.editor.textContent.split("\n");

    // Determine affected line indices
    let charCount = 0, lineIndices = [];
    lines.forEach((line, idx) => {
        const lineStart = charCount;
        const lineEnd = charCount + line.length;

        if (collapsed) {
            // No selection: affect only the line containing the cursor
            if (start >= lineStart && start <= lineEnd) lineIndices.push(idx);
        } else {
            // Selection exists: affect only lines with selected visible content
            const selStartInLine = Math.max(0, start - lineStart);
            const selEndInLine = Math.min(line.length, end - lineStart);
            const hasSelectedContent = line.slice(selStartInLine, selEndInLine).replace(/\n/g, "").length > 0;

            if (!(end < lineStart || start > lineEnd) && hasSelectedContent) {
                lineIndices.push(idx);
            }
        }

        charCount += line.length + 1; // +1 for newline
    });

    // Track adjustments for each line
    const lineAdjustments = [];

    // Apply indentation/unindentation
    lineIndices.forEach(idx => {
        if (indent) {
            lines[idx] = this.indentString + lines[idx];
            lineAdjustments.push(this.indentString.length);
        } else if (lines[idx].startsWith(this.indentString)) {
            lines[idx] = lines[idx].slice(this.indentString.length);
            lineAdjustments.push(-this.indentString.length);
        } else {
            lineAdjustments.push(0);
        }
    });

    // Adjust selection based on actual changes
    let newStart = start;
    let newEnd = end;

    lineIndices.forEach((idx, i) => {
        const lineStartChar = lines.slice(0, idx).join("\n").length + idx; // +idx for newlines
        const adjust = lineAdjustments[i];

        if (adjust !== 0) {
            if (newStart > lineStartChar) newStart += adjust;
            if (newEnd > lineStartChar) newEnd += adjust;
        }
    });

    this.editor.textContent = lines.join("\n");
    this.lastState = this.editor.textContent;

    // Restore original selection direction
    if (reversed) [newStart, newEnd] = [newEnd, newStart];

    this._restoreSelection({ start: newStart, end: newEnd, collapsed });
}





// -------------------------
// Spellcheck
// -------------------------
setSpellCheck(enabled = true) {
    if (!this.editor) return;
    const selection = this._getSelectionOffsets();
    this.editor.spellcheck = !!enabled;
    this._refreshContent(selection);
}

toggleSpellCheck() {
    if (!this.editor) return;
    const selection = this._getSelectionOffsets();
    this.editor.spellcheck = !this.editor.spellcheck;
    this._refreshContent(selection);
}

// Force browser to refresh spellcheck highlights without losing selection
_refreshContent(selection) {
    const content = this.editor.innerHTML; // preserve HTML if any
    this.editor.innerHTML = "";            // clear content
    this.editor.innerHTML = content;       // restore content
    this._restoreSelection(selection);     // restore selection
}


    // -------------------------
    // Public API
    // -------------------------
    async liveEditElementData(targetElement) {
        this.initialize(targetElement);
        return new Promise(resolve => {
            const onEscape = e => {
                if (e.key === "Escape") {
                    document.removeEventListener("keydown", onEscape);
                    const result = this.editor.textContent;
                    this.destroy();
                    resolve(result);
                }
            };
            document.addEventListener("keydown", onEscape);
        });
    }
}

