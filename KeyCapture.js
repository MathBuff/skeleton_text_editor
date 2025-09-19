//This is a system meant to use one listener to be taken and destroyed at specified times
//It uses direct key helpers for alot of things unlike other protocols and things I've made which chalk
//shift control and alt with any button to a single string of sorts.
export class KeyCapture {
    constructor(target = window) {
        this.target = target;
        this.keyQueue = [];
        this._waitingResolve = null;
        this.keyHandler = this._keyHandler.bind(this);
    }

    _keyHandler(e) {
        if (e.type !== "keydown") return;
        if (e.isComposing) return; // ignore IME composition

        // Prevent default for editing-related keys
        const keysToPrevent = [
            "ArrowLeft","ArrowRight","ArrowUp","ArrowDown",
            "Backspace","Delete","Tab","Enter","Home","End","Escape"
        ];
        if (keysToPrevent.includes(e.key) || (e.key.length === 1 && !e.ctrlKey && !e.metaKey)) {
            try { e.preventDefault(); } catch {}
        }

        this.keyQueue.push(e);

        if (this._waitingResolve) {
            const resolve = this._waitingResolve;
            this._waitingResolve = null;
            resolve(this.keyQueue.shift());
        }
    }

    start() {
        this.target.addEventListener("keydown", this.keyHandler, true);
    }

    stop() {
        this.target.removeEventListener("keydown", this.keyHandler, true);
        this.keyQueue = [];
        this._waitingResolve = null;
    }

    waitForKey() {
        if (this.keyQueue.length) {
            return Promise.resolve(this.keyQueue.shift());
        }
        return new Promise(resolve => {
            this._waitingResolve = resolve;
        });
    }
}

