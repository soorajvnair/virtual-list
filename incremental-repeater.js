import {VirtualRepeater} from './virtual-repeater.js';

export class IncrementalRepeater extends VirtualRepeater {
  constructor(config = {}) {
    super(config);
    // Default.
    this.chunk = config.chunk || 1;
    this._asyncRenderChunkId = null;
  }

  set items(items) {
    if (items !== this._items) {
      super.items = items;
      this.num = this._chunk;
    }
  }

  get chunk() {
    return this._chunk;
  }

  set chunk(chunk) {
    this._chunk = Math.max(chunk, 1);
  }

  _render() {
    super._render();
    if (!this._asyncRenderChunkId) {
      // TODO: what's the best timing?
      this._asyncRenderChunkId = requestIdleCallback(() => {
        this._asyncRenderChunkId = null;
        // TODO: adaptive chunk like in dom-repeat?
        const num = this._num + this._chunk;
        if (this._items && num <= this._items.length) {
          this.num = num;
        }
      });
    }
  }
};
