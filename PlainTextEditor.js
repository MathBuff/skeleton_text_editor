/*
This class is meant to be able to point at an element full of plain text, and allow it to be
editable like a programming text editor.
*/
class PlainTextEditor{
constructor(textElement, routineNumber){

//Tabs
    this.INDENT_STRING = "    ";

//whatever the text of the element is
    this.text = "sigmaMale(Hormones)\n    return hormones+2\nfarted='crack'\nsigmaMale(farted)";

//Element Grabs from main.html
    this.editor = document.getElementById("editor");
    this.cursor = document.getElementById("cursor");

//cursor
    this.cursorIndex = 0;
    this.desiredColumn = 0;
    this.blinkTimer;

// Selection variables
    this.selectionTarget1 = 0;
    this.selectionTarget2 = 0;
    this.isSelecting = false;
    this.mouseSelecting = false;

    this.clipboard = ""; // stores copied text

//double Click mouse selection
    this.lastClickTime = 0;
    this.doubleClickThreshold = 300; // ms

//undo and redo stacks
    this.undoStack = [];
    this.redoStack = [];
    this.MAX_HISTORY = 100; // optional limit
//Event Listeners
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("mouseup", this.handleMouseUp);

}//END OF CONSTRUCTOR

//(UNDO_REDO)=================================================================================================
saveState() {
    // Push current state to undo stack
    this.undoStack.push({
        text: this.text,
        cursorIndex: this.cursorIndex,
        selectionTarget1: this.selectionTarget1,
        selectionTarget2: this.selectionTarget2
    });

    // Limit stack size
    if (undoStack.length > MAX_HISTORY){ 
        this.undoStack.shift();
    }

    // Clear redo stack whenever a new edit is made
    this.redoStack = [];
}
//----------------------------------------------------------------------------------------------------
undo() {
  if (this.undoStack.length === 0) return;

  // Save current state to redo stack
  this.redoStack.push({
    text: this.text,
    cursorIndex: this.cursorIndex,
    selectionTarget1: this.selectionTarget1,
    selectionTarget2: this.selectionTarget2
  });

  const prevState = this.undoStack.pop();

  this.text = prevState.text;
  this.cursorIndex = prevState.cursorIndex;
  this.selectionTarget1 = prevState.selectionTarget1;
  this.selectionTarget2 = prevState.selectionTarget2;

  this.updateEditor();
  this.placeCursor(this.cursorIndex);
  this.updateSelectionHighlights();
}
//----------------------------------------------------------------------------------------------------
redo() {
  if (this.redoStack.length === 0) return;

  // Save current state to undo stack
  this.undoStack.push({
    text: this.text,
    cursorIndex: this.cursorIndex,
    selectionTarget1: this.selectionTarget1,
    selectionTarget2: this.selectionTarget2
  });

  const nextState = this.redoStack.pop();

  this.text = nextState.text;
  this.cursorIndex = nextState.cursorIndex;
  this.selectionTarget1 = nextState.selectionTarget1;
  this.selectionTarget2 = nextState.selectionTarget2;

  this.updateEditor();
  this.placeCursor(cursorIndex);
  this.updateSelectionHighlights();
}

//(MOUSE_EVENT_LISTENER_HELPERS)======================================================================================

handleMouseDown(e) {
  const index = this.getIndexFromMousePosition(e.clientX, e.clientY);

  const now = Date.now();
  if (now - this.lastClickTime < this.doubleClickThreshold) {
    // Double click → select word
    await this.selectWordAtIndex(index);
  } else {
    // Single click → normal cursor placement
    this.cursorIndex = index;
    this.selectionAnchor = index;        
    this.selectionTarget1 = this.selectionTarget2 = index;
    this.desiredColumn = await this.getColumn(this.cursorIndex);
    await this.placeCursor(this.cursorIndex);
    await this.clearSelectionHighlights();
  }

  this.lastClickTime = now;

  // Start normal mouse selection (drag)
  this.mouseSelecting = true;
  this.isSelecting = true;
  e.preventDefault();
}




//----------------------------------------------------------------------------------------------------


handleMouseMove(e) {
  if (!this.mouseSelecting) return;
  const index = this.getIndexFromMousePosition(e.clientX, e.clientY);
  this.cursorIndex = index;
  this.desiredColumn = this.getColumn(this.cursorIndex);
  this.placeCursor(this.cursorIndex);

  this.updateSelection(this.cursorIndex); // normal selection
}



//----------------------------------------------------------------------------------------------------


handleMouseUp(e) {
  if (this.mouseSelecting) {
    this.mouseSelecting = false;
    if (this.selectionTarget1 === this.selectionTarget2) this.clearSelectionHighlights();
  }
}

//----------------------------------------------------------------------------------------------------
selectWordAtIndex(index) {
    if (this.text.length === 0){ 
    return;}

    // Expand left to start of word
    let start = index;
    while (start > 0 && this.isLetterOrDigit(this.text[start - 1])) start--;

    // Expand right to end of word
    let end = index;
    while (end < text.length && this.isLetterOrDigit(this.text[end])) end++;

    this.selectionTarget1 = start;
    this.selectionTarget2 = end;
    this.cursorIndex = end;
    this.selectionAnchor = start;

    this.updateSelectionHighlights();
    this.placeCursor(cursorIndex);
}


//(MOUSE_EVENT_HELPERS)======================================================================================
getIndexFromMousePosition(clientX, clientY) {
    const editorRect = this.editor.getBoundingClientRect();
    const style = this.getComputedStyle(this.editor);
    const lineHeight = parseFloat(style.lineHeight) || 27;

    const clickedLine = Math.floor((clientY - editorRect.top) / lineHeight);
    const relativeX = clientX - editorRect.left;

    const lines = text.split('\n');
    const lineIndex = Math.max(0, Math.min(clickedLine, lines.length - 1));
    const line = lines[lineIndex];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = style.font;

    let closestIndex = 0, closestDist = Infinity;

    for (let i = 0; i <= line.length; i++) {
      const distance = Math.abs(ctx.measureText(line.substring(0, i)).width - relativeX);
      if (distance < closestDist) {
        closestDist = distance;
        closestIndex = i;
      }
    }

    let absoluteIndex = 0;
    for (let i = 0; i < lineIndex; i++) absoluteIndex += lines[i].length + 1;
    absoluteIndex += closestIndex;

    return Math.max(0, Math.min(absoluteIndex, text.length));
  }

//(TEXT_EDITOR_DRIVERS)======================================================================================
updateEditor() {
  this.editor.textContent = text;
  // sanitize selection after text changes (text.length may have changed)
  this.clampSelection();
}


// ---------- add this helper near the top ----------
clampSelection() {
    // make sure selection targets are numbers
    this.selectionTarget1 = Number(selectionTarget1);
    this.selectionTarget2 = Number(selectionTarget2);

    if (!Number.isFinite(selectionTarget1)){ 
        selectionTarget1 = 0;
    }

    if (!Number.isFinite(selectionTarget2)){
        selectionTarget2 = 0;
    }

    // if either was negative (or otherwise strange), log to help trace origin
    if (selectionTarget1 < 0 || selectionTarget2 < 0) {
    console.warn("clampSelection: detected negative selection before clamp:", this.selectionTarget1, this.selectionTarget2);
    console.trace();
    }

    // ensure start <= end
    if (this.selectionTarget1 > this.selectionTarget2) {
    const tmp = this.selectionTarget1;
    this.selectionTarget1 = this.selectionTarget2;
    this.selectionTarget2 = tmp;
    }

    // clamp to valid range
    this.selectionTarget1 = Math.max(0, Math.min(this.selectionTarget1, this.text.length));
    this.selectionTarget2 = Math.max(0, Math.min(this.selectionTarget2, this.text.length));
    }

//(SELECTION)======================================================================================
clearSelectionHighlights() {
    document.querySelectorAll('.selection-highlight').forEach(h => h.remove());
}

//----------------------------------------------------------------------------------------------------
startSelection() {
  // only set the anchor if we don't already have one
  if (this.selectionAnchor === null) {
    this.selectionAnchor = this.cursorIndex;
    this.isSelecting = true;
    // initialize selectionTargets to be the anchor (no visible selection yet)
    this.selectionTarget1 = this.selectionTarget2 = this.cursorIndex;
  }
}

//----------------------------------------------------------------------------------------------------
updateSelection(newIndex) {
  // if we don't have an anchor, nothing to update
  if (this.selectionAnchor === null) return;

  // compute ordered targets from anchor -> newIndex
  if (newIndex >= this.selectionAnchor) {
    this.selectionTarget1 = this.selectionAnchor;
    this.selectionTarget2 = newIndex;
  } else {
    this.selectionTarget1 = newIndex;
    this.selectionTarget2 = this.selectionAnchor;
  }

  // draw selection
  this.updateSelectionHighlights();
}

//----------------------------------------------------------------------------------------------------
clearSelection() {
  // clear anchor and selection
  this.selectionAnchor = null;
  this.isSelecting = false;
  this.selectionTarget1 = this.selectionTarget2 = this.cursorIndex;
  this.updateSelectionHighlights();
}


//----------------------------------------------------------------------------------------------------
updateSelectionHighlights() {
    this.clearSelectionHighlights();

    // sanitize selection before using it
    this.clampSelection();

    if (this.selectionTarget1 === this.selectionTarget2){ 
        return;
    }

    const start = this.selectionTarget1;
    const end = this.selectionTarget2;

    const editorRect = this.editor.getBoundingClientRect();
    const style = getComputedStyle(this.editor);
    const lineHeight = parseFloat(style.lineHeight) || 27;

    const lines = this.text.split('\n');
    let charCount = 0;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = style.font;

    for (let i = 0; i < lines.length; i++) {
    const lineStart = charCount;
    const lineEnd = charCount + lines[i].length;

    if (start <= lineEnd && end >= lineStart) {
      const selStart = Math.max(start, lineStart) - lineStart;
      const selEnd = Math.min(end, lineEnd) - lineStart;

      const beforeWidth = ctx.measureText(lines[i].substring(0, selStart)).width;
      const selWidth = ctx.measureText(lines[i].substring(selStart, selEnd)).width;

      const highlight = document.createElement('div');
      highlight.className = 'selection-highlight';
      highlight.style.left = (editorRect.left + beforeWidth) + 'px';
      highlight.style.top = (editorRect.top + i * lineHeight) + 'px';
      highlight.style.width = selWidth + 'px';
      highlight.style.height = lineHeight + 'px';

      document.body.appendChild(highlight);
    }
    charCount += lines[i].length + 1;
    }
}

//(CLIPBOARD_CONTROLS)=====================================================================================================
    copySelection() {
        if (this.selectionTarget1 !== this.selectionTarget2) {
            const start = Math.min(this.selectionTarget1, this.selectionTarget2);
            const end = Math.max(this.selectionTarget1, this.selectionTarget2);
            this.clipboard = this.text.slice(start, end); // copy the text inclusively
        } else {
            this.clipboard = ""; // nothing selected, clear clipboard
        }
        console.log("Copied text:", this.clipboard); // optional debug
    }
//----------------------------------------------------------------------------------------------------
    pasteClipboard() {

        if (!this.clipboard){
            return;
        } // nothing to paste

        this.saveState();

        if (this.selectionTarget1 !== this.selectionTarget2) {
            // If a selection exists, replace it
            const start = Math.min(this.selectionTarget1, this.selectionTarget2);
            const end = Math.max(this.selectionTarget1, this.selectionTarget2);
            this.text = this.text.slice(0, start) + this.clipboard + this.text.slice(end);
            this.cursorIndex = start + this.clipboard.length;
            this.clearSelection();
        } else {
            // Otherwise, insert at cursor
            this.text = this.text.slice(0, this.cursorIndex) + this.clipboard + this.text.slice(this.cursorIndex);
            this.cursorIndex += this.clipboard.length;
        }

        this.desiredColumn = this.getColumn(this.cursorIndex);
        this.updateEditor();
        this.placeCursor(this.cursorIndex);
    }
//----------------------------------------------------------------------------------------------------
    cutSelection() {

      if (this.selectionTarget1 !== this.selectionTarget2) {
        this.saveState();
        // Copy the selection to the clipboard
        this.copySelection();
        // Delete the selected text
        this.deleteCharacter();
      }

    }

//(CURSOR_DISPLAY_&_LOCATION)======================================================================================
  resetBlink() {
    this.cursor.style.opacity = "1";
    this.cursor.style.animation = "none";
    clearTimeout(this.blinkTimer);
    this.blinkTimer = setTimeout(() => {
      this.cursor.style.animation = "blink 1s step-end infinite";
    }, 600);
  }

//----------------------------------------------------------------------------------------------------
  placeCursor(index) {
    this.cursorIndex = Math.max(0, Math.min(index, this.text.length));

    const textNode = this.editor.firstChild;
    if (!textNode) return;

    const editorRect = this.editor.getBoundingClientRect();
    const style = getComputedStyle(this.editor);
    const lineHeight = parseFloat(style.lineHeight) || 27;

    const lines = text.split('\n');
    let charCount = 0;
    let currentLine = 0;
    let posInLine = 0;

    for (let i = 0; i < lines.length; i++) {
      if (this.cursorIndex <= charCount + lines[i].length) {
        currentLine = i;
        posInLine = cursorIndex - charCount;
        break;
      }
      charCount += lines[i].length + 1;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = style.font;

    const textWidth = ctx.measureText(lines[currentLine].substring(0, posInLine)).width;

    cursor.style.left = (editorRect.left + textWidth) + "px";
    cursor.style.top = (editorRect.top + currentLine * lineHeight) + "px";
    cursor.style.height = lineHeight + "px";

    this.resetBlink();
  }

//----------------------------------------------------------------------------------------------------
  getColumn(index) {
    return index - (text.lastIndexOf("\n", index - 1) + 1);
  }

//(TYPING)======================================================================================
insertCharacter(char) {
    this.saveState();

    if (this.selectionTarget1 !== this.selectionTarget2) {
        const start = Math.min(this.selectionTarget1, this.selectionTarget2);
        const end = Math.max(this.selectionTarget1, this.selectionTarget2);
        this.text = this.text.slice(0, start) + char + this.text.slice(end);
        this.cursorIndex = start + char.length;
        this.clearSelection();

    } else {
        this.text = this.text.slice(0, this.cursorIndex) + char + this.text.slice(this.cursorIndex);
        this.cursorIndex += char.length;
    }

    this.desiredColumn = this.getColumn(this.cursorIndex);
    this.updateEditor();
    this.placeCursor(this.cursorIndex);
}
//----------------------------------------------------------------------------------------------------
deleteCharacter() {

    this.saveState();

    if (this.selectionTarget1 !== this.selectionTarget2) {
        const start = Math.min(this.selectionTarget1, this.selectionTarget2);
        const end = Math.max(this.selectionTarget1, this.selectionTarget2);
        this.text = this.text.slice(0, start) + this.text.slice(end);
        this.cursorIndex = start;
        this.clearSelection();
    } else if (this.cursorIndex > 0) {
        this.text = this.text.slice(0, this.cursorIndex - 1) + this.text.slice(this.cursorIndex);
        this.cursorIndex--;
    }
    this.desiredColumn = this.getColumn(this.cursorIndex);
    this.updateEditor();
    this.placeCursor(this.cursorIndex);
}
//----------------------------------------------------------------------------------------------------
waitForKey() {
    return new Promise(resolve => {
        const handler = e => {
        document.removeEventListener("keydown", handler);
        resolve(e);
    };
        document.addEventListener("keydown", handler);
    });
}

//(WORD_JUMPING_SYSTEM)=============================================================================================
isLetterOrDigit(char) {
  return /[a-zA-Z0-9]/.test(char);
}
//----------------------------------------------------------------------------------------------------
isSymbolOrWhitespace(char) {
  return !this.isLetterOrDigit(char);
}
//----------------------------------------------------------------------------------------------------
jumpWordRight(index) {
    if (index >= this.text.length){
        return this.text.length;
    }

    // Step 1: skip any whitespace at the current position
    while (index < this.text.length && /\s/.test(this.text[index])){ 
        index++;
    }

    if (index >= this.text.length){ 
        return this.text.length;
    }

    // Step 2: jump to the next type change
    const startChar = this.text[index];
    const startType = this.isLetterOrDigit(startChar) ? 'letter' : 'symbol';

    let i = index;

    while (i < text.length) {
        const char = text[i];
        const charType = isLetterOrDigit(char) ? 'letter' : 'symbol';
        if (charType !== startType){ 
            break;
        }
        i++;
    }

    return i;
}
//----------------------------------------------------------------------------------------------------
jumpWordLeft(index) {
  if (index <= 0) return 0;

  // Step 1: skip any whitespace immediately to the left
  while (index > 0 && /\s/.test(this.text[index - 1])) index--;

  if (index <= 0) return 0;

  // Step 2: jump to the previous type change
  const startChar = this.text[index - 1];
  const startType = this.isLetterOrDigit(startChar) ? 'letter' : 'symbol';

  let i = index;
  while (i > 0) {
    const char = this.text[i - 1];
    const charType = this.isLetterOrDigit(char) ? 'letter' : 'symbol';
    if (charType !== startType) break;
    i--;
  }

  return i;
}
//----------------------------------------------------------------------------------------------------

//(INDENTATION)======================================================================================

indentSelection() {
  this.saveState();
  if (this.selectionTarget1 === this.selectionTarget2) {
    // No selection → insert a single tab at cursor
    this.insertCharacter(INDENT_STRING);
    return;
  }

  const start = Math.min(this.selectionTarget1, this.selectionTarget2);
  const end = Math.max(this.selectionTarget1, this.selectionTarget2);

  const lines = this.text.split("\n");

  let charCount = 0;
  let newStart = start;
  let newEnd = end;

  for (let i = 0; i < lines.length; i++) {
    const lineStart = charCount;
    const lineEnd = charCount + lines[i].length;

    // If the line overlaps the selection, add INDENT_STRING at start
    if (lineEnd >= start && lineStart <= end) {
      lines[i] = INDENT_STRING + lines[i];

      // Adjust selection offsets
      if (lineStart < start) newStart += INDENT_STRING.length;
      newEnd += INDENT_STRING.length;
    }

    charCount += lines[i].length + 1; // +1 for newline
  }

  this.text = lines.join("\n");
  this.selectionTarget1 = newStart;
  this.selectionTarget2 = newEnd;

    this.updateEditor();
    this.placeCursor(selectionTarget2);
    this.updateSelectionHighlights();
}
//----------------------------------------------------------------------------------------------------

unindentSelection() {

  if (this.selectionTarget1 === this.selectionTarget2) return; // nothing selected
  this.saveState();

  const start = Math.min(this.selectionTarget1, this.selectionTarget2);
  const end = Math.max(this.selectionTarget1, this.selectionTarget2);

  const origLines = this.text.split("\n");

  // compute original start index of each line (based on original text)
  const origLineStarts = new Array(origLines.length);
  let pos = 0;
  for (let i = 0; i < origLines.length; i++) {
    origLineStarts[i] = pos;
    pos += origLines[i].length + 1; // +1 for newline
  }

  // We'll build the new lines array from the originals
  const newLines = origLines.slice();

  let newStart = start;
  let newEnd = end;

  for (let i = 0; i < origLines.length; i++) {
    const lineStart = origLineStarts[i];
    const lineLength = origLines[i].length;
    // lineEnd (index of the newline) = lineStart + lineLength

    // compute selection overlap with this line in *original* coordinates
    const selStartInLine = Math.max(0, start - lineStart);
    const selEndInLine = Math.min(lineLength, end - lineStart);

    // if no overlap (selection doesn't include any char of this line), skip it
    if (selStartInLine >= selEndInLine) continue;

    // determine how many prefix whitespace chars we would remove (based on original line)
    let removeCount = 0;
    if (origLines[i].startsWith(this.INDENT_STRING)) {
      removeCount = this.INDENT_STRING.length;
    } else {
      const m = origLines[i].match(/^\s+/);
      if (m) removeCount = Math.min(m[0].length, this.INDENT_STRING.length);
    }

    if (removeCount === 0) continue; // nothing to remove on this line

    // update the line content (remove prefix spaces/tabs)
    newLines[i] = origLines[i].slice(removeCount);

    // compute how many of the removed chars were:
    // - before the selection start in this line (should reduce global selection start)
    // - inside the selected area of this line (should reduce global selection end)
    const removedBeforeStart = Math.min(removeCount, selStartInLine);
    const removedBeforeEnd = Math.min(removeCount, selEndInLine);
    const removedInsideSelection = Math.max(0, removedBeforeEnd - removedBeforeStart);

    if (lineStart < start) {
      // some removed characters were before the overall selection start — shift it left
      newStart -= removedBeforeStart;
    }
    // reduce newEnd by only the number of removed characters that were inside the selection
    newEnd -= removedInsideSelection;
  }

  // join newLines into text and clamp selection
  this.text = newLines.join("\n");
  // sanitize and set selection targets
  newStart = Math.max(0, newStart);
  newEnd = Math.max(newStart, newEnd);
  this.selectionTarget1 = newStart;
  this.selectionTarget2 = newEnd;

  this.updateEditor();
  this.placeCursor(selectionTarget2);
  this.updateSelectionHighlights();
}

//----------------------------------------------------------------------------------------------------

unindentCurrentLine() {
  this.saveState();
  // Find the current line boundaries
  const lineStart = this.text.lastIndexOf("\n", this.selectionTarget1 - 1) + 1;
  const lineEnd = this.text.indexOf("\n", this.selectionTarget1);
  const actualLineEnd = (lineEnd === -1 ? this.text.length : lineEnd);

  const line = text.slice(lineStart, actualLineEnd);

  let removeCount = 0;
  if (line.startsWith(this.INDENT_STRING)) {
    removeCount = this.INDENT_STRING.length;
  } else {
    const match = line.match(/^\s+/);
    if (match) removeCount = Math.min(match[0].length, this.INDENT_STRING.length);
  }

  if (removeCount > 0) {
    const newLine = line.slice(removeCount);
    this.text = this.text.slice(0, lineStart) + newLine + this.text.slice(actualLineEnd);

    // Adjust cursor and clear selection
    this.selectionTarget1 = Math.max(lineStart, this.selectionTarget1 - removeCount);
    this.selectionTarget2 = this.selectionTarget1;

    this.updateEditor();
    this.placeCursor(this.selectionTarget1);
    this.updateSelectionHighlights();
  }
}

// (TEXT_EDITOR_CONTROL_HELPERS) ======================================================================

handleArrowRight(shift, currentColumn, ctrl) {
  event.preventDefault();

  if (ctrl) {
    const newIndex = this.jumpWordRight(this.cursorIndex);
    if (shift) this.startSelection();
    this.cursorIndex = this.newIndex;
    if (shift) this.updateSelection(this.cursorIndex); else this.clearSelection();
    this.placeCursor(this.cursorIndex);
    this.desiredColumn = this.getColumn(this.cursorIndex);
    return;
  }

  // Original single-step arrow right
  if (shift) {
    this.startSelection();
    if (this.cursorIndex < this.text.length) this.cursorIndex++;
    this.updateSelection(this.cursorIndex);
  } else {
    if (this.selectionTarget1 !== this.selectionTarget2) this.cursorIndex = Math.max(this.selectionTarget1, this.selectionTarget2);
    this.clearSelection();
    if (this.cursorIndex < this.text.length) this.cursorIndex++;
  }

  placeCursor(this.cursorIndex);
  desiredColumn = getColumn(this.cursorIndex);
}

// ----------------------------------------------------------------------------------------------------

handleArrowLeft(shift, currentColumn, ctrl) {
  event.preventDefault();

  if (ctrl) {
    const newIndex = this.jumpWordLeft(this.cursorIndex);
    if (shift) this.startSelection();
    cursorIndex = newIndex;
    if (shift) this.updateSelection(this.cursorIndex); else this.clearSelection();
    this.placeCursor(this.cursorIndex);
    this.desiredColumn = this.getColumn(this.cursorIndex);
    return;
  }

  // Original single-step arrow left
  if (shift) {
    this.startSelection();
    if (this.cursorIndex > 0) this.cursorIndex--;
    this.updateSelection(this.cursorIndex);
  } else {
    if (this.selectionTarget1 !== this.selectionTarget2) this.cursorIndex = Math.min(this.selectionTarget1, this.selectionTarget2);
    this.clearSelection();
    if (this.cursorIndex > 0) this.cursorIndex--;
  }

  this.placeCursor(this.cursorIndex);
  this.desiredColumn = this.getColumn(this.cursorIndex);
}


// ----------------------------------------------------------------------------------------------------

handleArrowUp(shift) {
  event.preventDefault();

  // Find current line start
  const currentLineStart = this.text.lastIndexOf("\n", this.cursorIndex - 1) + 1;

  // If already on the first line, clamp to start of text
  if (currentLineStart === 0) {
    this.cursorIndex = 0;
    if (shift) this.updateSelection(this.cursorIndex);
    else this.clearSelection();
    this.placeCursor(this.cursorIndex);
    return;
  }

  if (shift) this.startSelection();

  // Find previous line start/end
  const prevLineEnd = currentLineStart - 1;
  const prevLineStart = this.text.lastIndexOf("\n", prevLineEnd - 1) + 1;

  const prevLineLength = prevLineEnd - prevLineStart;
  const col = Math.min(desiredColumn, prevLineLength);

  this.cursorIndex = prevLineStart + col;

  if (shift) this.updateSelection(this.cursorIndex);
  else this.clearSelection();

  this.placeCursor(this.cursorIndex);
}




// ----------------------------------------------------------------------------------------------------

handleArrowDown(shift) {
  event.preventDefault();

  // Find current line start and end
  const currentLineStart = this.text.lastIndexOf("\n", this.cursorIndex - 1) + 1;
  let currentLineEnd = this.text.indexOf("\n", this.cursorIndex);
  if (currentLineEnd === -1) currentLineEnd = this.text.length;

  // If at last line, clamp to text end
  if (currentLineEnd === this.text.length) {
    cursorIndex = this.text.length;
    if (shift) this.updateSelection(this.cursorIndex);
    else this.clearSelection();
    this.placeCursor(this.cursorIndex);
    return;
  }

  if (shift) this.startSelection();

  // Find next line start and end
  const nextLineStart = currentLineEnd + 1;
  let nextLineEnd = this.text.indexOf("\n", nextLineStart);
  if (nextLineEnd === -1) nextLineEnd = this.text.length;

  const nextLineLength = nextLineEnd - nextLineStart;
  const col = Math.min(this.desiredColumn, nextLineLength);

  this.cursorIndex = nextLineStart + col;

  if (shift) this.updateSelection(this.cursorIndex);
  else this.clearSelection();

  this.placeCursor(this.cursorIndex);
}

// ----------------------------------------------------------------------------------------------------

handleHome(shift) {
  event.preventDefault();

  if (shift) {
    this.startSelection();
  }

  const lineStart = this.text.lastIndexOf("\n", this.cursorIndex - 1);

  this.cursorIndex = (lineStart === -1)
    ? 0
    : lineStart + 1;

  if (shift) {
    this.updateSelection(this.cursorIndex);
  } else {
    this.clearSelection();
  }

  this.desiredColumn = 0;
  this.placeCursor(this.cursorIndex);
}

// ----------------------------------------------------------------------------------------------------

handleEnd(shift) {
  event.preventDefault();

  if (shift) {
    this.startSelection();
  }

  const lineEnd = this.text.indexOf("\n", this.cursorIndex);

  this.cursorIndex = (lineEnd === -1)
    ? this.text.length
    : lineEnd;

  if (shift) {
    this.updateSelection(this.cursorIndex);
  } else {
    this.clearSelection();
  }

  this.desiredColumn = this.getColumn(this.cursorIndex);
  this.placeCursor(this.cursorIndex);
}
// ----------------------------------------------------------------------------------------------------
forwardDeleteCharacter() {
    this.saveState();


  if (this.selectionTarget1 !== this.selectionTarget2) {
    // If there’s a selection, delete it
    const start = Math.min(this.selectionTarget1, this.selectionTarget2);
    const end = Math.max(this.selectionTarget1, this.selectionTarget2);
    this.text = this.text.slice(0, start) + this.text.slice(end);
    this.cursorIndex = start;
    this.clearSelection();
  } else if (this.cursorIndex < this.text.length) {
    // Otherwise, delete the character ahead of the cursor
    this.text = this.text.slice(0, this.cursorIndex) + this.text.slice(this.cursorIndex + 1);
  }
  this.desiredColumn = this.getColumn(this.cursorIndex);
  this.updateEditor();
  this.placeCursor(this.cursorIndex);
}


//(CONTROL_LOOP)======================================================================================
async controlLoop() {
  while (true) {
    const e = await waitForKey();

    console.log( 
        "Cursor:", this.cursorIndex, 
        "Selection:", this.selectionTarget1, "-", this.selectionTarget2, 
        "Undo Stack:", this.undoStack.length, 
        "Redo Stack:", this.redoStack.length 
        );

    const lineStart = this.text.lastIndexOf("\n", this.cursorIndex - 1);
    const currentColumn = this.cursorIndex - (lineStart === -1 ? 0 : lineStart + 1);
    const shiftPressed = e.shiftKey;

    // --------------------------------------------------------------------------------
    // Arrow keys
    // --------------------------------------------------------------------------------
    if (e.key === "ArrowRight") {
      this.handleArrowRight(shiftPressed, currentColumn, e.ctrlKey);
    } else if (e.key === "ArrowLeft") {
      this.handleArrowLeft(shiftPressed, currentColumn, e.ctrlKey);
    } else if (e.key === "ArrowUp") {
      this.handleArrowUp(shiftPressed);

    } else if (e.key === "ArrowDown") {
      this.handleArrowDown(shiftPressed);

    } else if (e.key === "Home") {
      this.handleHome(shiftPressed);

    } else if (e.key === "End") {
      this.handleEnd(shiftPressed);

    // --------------------------------------------------------------------------------
    // Editing keys
    // --------------------------------------------------------------------------------
    } else if (e.key === "Backspace") {
      e.preventDefault();
      this.deleteCharacter();

    } else if (e.key === "Enter") {
      e.preventDefault();
      this.insertCharacter("\n");

    } else if (e.key === "Delete") {
        e.preventDefault();
        this.forwardDeleteCharacter();

    // --------------------------------------------------------------------------------
    // Printable characters
    // --------------------------------------------------------------------------------
    } else if (
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.altKey &&
      !e.metaKey
    ) {
      e.preventDefault();
      insertCharacter(e.key);

    // --------------------------------------------------------------------------------
    // Clipboard controls
    // --------------------------------------------------------------------------------
    }else if (e.key.toLowerCase() === "c" && e.ctrlKey) {
        e.preventDefault();
        this.copySelection();

    }else if (e.key.toLowerCase() === "v" && e.ctrlKey) {
        e.preventDefault();
        this.pasteClipboard();

    }else if (e.key.toLowerCase() === "x" && e.ctrlKey) {
        e.preventDefault();
        this.cutSelection();

    // --------------------------------------------------------------------------------
    // Indentation
    // --------------------------------------------------------------------------------

    }else if (e.key === "Tab" && e.shiftKey && selectionTarget1 === selectionTarget2) {
        e.preventDefault();
        this.unindentCurrentLine();

    }else if (e.key === "Tab") {
        e.preventDefault();
        if (shiftPressed) {
            this.unindentSelection();
        } else {
            this.indentSelection();
        }

    // --------------------------------------------------------------------------------
    // Undo & Redo
    // --------------------------------------------------------------------------------
    } else if (e.ctrlKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        this.undo();
    } else if (e.ctrlKey && e.key.toLowerCase() === "y") {
        e.preventDefault();
        this.redo();

    // --------------------------------------------------------------------------------
    // Miscellaneous keys → clear selection if appropriate
    // --------------------------------------------------------------------------------

    } else if (!shiftPressed && !["Control", "Alt", "Meta", "CapsLock", "Tab"].includes(e.key)) {
        this.clearSelection();
    }
}
}

//(EXECUTION)======================================================================================
async runPlainTextEditor(){
  this.updateEditor();
  this.placeCursor(0);
  this.desiredColumn = 0;
  await this.controlLoop();
}
//--------------------------------------------------------------------------------------------------

}//END OF CLASS
