/**
* Contains the declaration for the {@link module:enyo/NewDataList~NewDataList} kind.
*
* @wip
* @public
* @module enyo/NewDataList
*/

require('enyo');

var
	kind = require('./kind'),
	dom = require('./dom');

var
	Scrollable = require('./Scrollable'),
	VirtualDataRepeater = require('./VirtualDataRepeater');

/**
* {@link module:enyo/NewDataList~NewDataList} is new virtual list implementation.
*
* It is intended to replace the older {@link module:enyo/DataList~DataList},
* {@link module:enyo/DataGridList~DataGridList} and probably
* {@link module:layout/List~List}, but as of the Enyo 2.7 release is a work in
* progress and currently lacks many of the features of those older implementations.
*
* The most significant difference between `NewDataList` and `DataList` / `DataGridList`
* is that `NewDataList` "virtualizes" items one at a time, not a page at a time. This
* approach performs somewhat better in general and most notably disributes the cost of
* virtualization over time, which produces smoother frame rates.
*
* `NewDataList` supports both linear and grid layouts, in either horizontal or
* vertical direction.
* 
* Notes:
*   * List items must be styled with `position: absolute` to be laid out properly,
*     but `NewDataList` does not currently provide any default style rules for items,
*     so you need to specify `position: absolute` in your items' classes or style attributes.
*   * `NewDataList` currently supports only explicitly sized items; neither variable-size
*      items nor "naturally" sized items are currently supported.
*
* @class NewDataList
* @extends module:enyo/VirtualDataRepeater~VirtualDataRepeater
* @wip
* @ui
* @public
*/
module.exports = kind(
	/** @lends module:enyo/NewDataList~NewDataList.prototype */ {
	name: 'enyo.NewDataList',
	kind: VirtualDataRepeater,
	/**
	* The direction of the layout, which may be either `'vertical'`
	* or `'horizontal'`.
	*
	* @type {String}
	* @default 'vertical'
	* @public
	*/
	direction: 'vertical',
	/**
	* The height of each list item, in pixels.
	* 
	* Required for grid layouts and linear vertical layouts; may be
	* omitted for linear horizontal layouts.
	*
	* @type {Number}
	* @default 100
	* @public
	*/
	itemHeight: 100,
	/**
	* The width of each list item, in pixels.
	* 
	* Required for grid layouts and linear horizontal layouts; may be
	* omitted for linear vertical layouts.
	*
	* @type {Number}
	* @default 100
	* @public
	*/
	itemWidth: 100,
	/**
	* The space between list items, in pixels.
	*
	* @type {Number}
	* @default 0
	* @public
	*/
	spacing: 0,
	/**
	* The number of rows (only applies to horizontally scrolling grid layouts).
	* 
	* To specify a horizontally scrolling grid layout, set `rows` to `2` or more
	* and `direction` to `horizontal`.
	*
	* @type {Number}
	* @default 'auto'
	* @public
	*/
	rows: 'auto',
	/**
	* The number of columns (only applies to vertically scrolling grid layouts).
	* 
	* To specify a vertically scrolling grid layout, set `columns` to `2` or more
	* and `direction` to `vertical`.
	*
	* @type {Number}
	* @default 'auto'
	* @public
	*/
	columns: 'auto',
	/**
	* This number determines how many "extra" items the list will generate, beyond
	* the number required to fill the list's viewport. Higher numbers result in more
	* extra items being generated.
	*
	* You should generally not need to adjust this value.
	*
	* @type {Number}
	* @default 3
	* @public
	*/
	overhang: 3,
	/**
	* This feature is experimental, and only partly functional.
	*
	* When `scrollToBoundaries` is set to `true`, the list will come to rest on an
	* item boundary, such that the first visible item is fully within the list's
	* viewport, not partially outside.
	*
	* Important limitation: this feature currently only works when scrolling in
	* response to wheel events or when scrolling to explicitly provided coordinates;
	* it does not work when scrolling in response to touch or mouse events.
	*
	* @type {Boolean}
	* @default false
	* @public
	*/
	scrollToBoundaries: false,
	/**
	* @private
	*/
	mixins: [Scrollable],
	/**
	* @private
	*/
	observers: [
		{method: 'reset', path: [
			'direction', 'columns', 'rows',
			'itemHeight', 'itemWidth', 'columns'
		]}
	],
	/**
	* Returns an array of list items that are currently visible (whether partially
	* or fully).
	* 
	* Experimental API -- subject to change.
	*
	* @public
	*/
	getVisibleItems: function() {
		return this.orderedChildren.slice(this.firstVisibleI, this.lastVisibleI + 1);
	},

	/**
	* Returns an array of list items that are currently fully visible.
	* 
	* Experimental API -- subject to change.
	*
	* @public
	*/
	getFullyVisibleItems: function() {
		return this.orderedChildren.slice(this.firstFullyVisibleI, this.lastFullyVisibleI + 1);
	},

	/**
	* Scrolls to a list item (specified by index).
	* 
	* @param {number} index - The (zero-based) index of the item to scroll to
	* @param {Object} opts - Scrolling options (see enyo/Scrollable#scrollTo)
	* @public
	*/
	scrollToItem: function (index, opts) {
		var b = this.getItemBounds(index);

		// If the item is near the horizontal or vertical
		// origin, scroll all the way there
		if (b.left <= this.spacing) {
			b.left = 0;
		}
		if (b.top <= this.spacing) {
			b.top = 0;
		}

		this.scrollTo(b.left, b.top, opts);
	},

	/**
	* @private
	*/
	calculateMetrics: function(opts) {
		var sp = this.spacing,
			n = this.hasNode(),
			oT = this.topOffset,
			oR = this.rightOffset,
			oB = this.bottomOffset,
			oL = this.leftOffset,
			cw = (opts && opts.width !== undefined) ?
				opts.width :
				n.clientWidth - oR - oL,
			ch = (opts && opts.height !== undefined) ?
				opts.height :
				n.clientHeight - oT - oB,
			s1, s2, md1, md2, d2x, si, is1, is2, d1, d2, minMax, num;

		if (this.direction == 'vertical') {
			s1 = ch;
			s2 = cw;
			md1 = this.minItemHeight;
			md2 = this.minItemWidth;
			is1 = this.itemHeight;
			is2 = this.itemWidth;
			d2x = this.columns;
			si = 'verticalSnapIncrement';
		}
		else {
			s1 = cw;
			s2 = ch;
			md1 = this.minItemWidth;
			md2 = this.minItemHeight;
			is1 = this.itemWidth;
			is2 = this.itemHeight;
			d2x = this.rows;
			si = 'horizontalSnapIncrement';
		}

		this.sizeItems = (md1 && md2);

		if (this.sizeItems) {
			// the number of columns is the ratio of the available width minus the spacing
			// by the minimum tile width plus the spacing
			d2x = Math.max(Math.floor((s2 - (sp * 2)) / (md2 + sp)), 1);
			// the actual tile width is a ratio of the remaining width after all columns
			// and spacing are accounted for and the number of columns that we know we should have
			is2 = Math.round((s2 - (sp * (d2x + 1))) / d2x);
			// the actual tile height is related to the tile width
			is1 = Math.round(md1 * (is2 / md2));
		}
		else if (d2x === 'auto') {
			d2x = 1;
		}
		
		d1 = sp + is1;
		d2 = sp + is2;

		minMax = d1 * 2;
		this.threshold = { min: -Infinity, max: minMax, minMax: minMax };

		num = d2x * (Math.ceil(s1 / d1) + this.overhang);

		this.dim2extent = d2x;
		this.itemSize = is1;
		this.itemSize2 = is2;
		this.delta = d1;
		this.delta2 = d2;
		this.size = s1;
		this.size2 = s2;

		if (this.scrollToBoundaries) {
			this.set(si, d1);
		}
		// We don't call the setter here, because doing so would trigger a
		// redundant and expensive call to doIt(). This approach should be fine
		// as long as calculateMetrics() is called only by reset().
		this.numItems = num;
	},

	/**
	* @private
	*/
	scroll: function() {
		var tt = this.threshold,
			v = (this.direction === 'vertical'),
			val = v ? this.scrollTop : this.scrollLeft;

		if (val > tt.max || val < tt.min) {
			this.refreshThresholds();
			this.doIt();
		}

		this.positionChildren();
	},

	/**
	* @private
	*/
	refreshThresholds: function () {
		var tt = this.threshold;

		if (tt) {
			var
				v = (this.direction === 'vertical'),
				val = v ? this.scrollTop : this.scrollLeft,
				delta = this.delta,
				cb = this.cachedBounds ? this.cachedBounds : this._getScrollBounds(),
				maxVal = v ? cb.maxTop : cb.maxLeft,
				minMax = tt.minMax,
				maxMin = maxVal - minMax,
				d2x = this.dim2extent,
				head = Math.floor(this.overhang / 2),
				fvg = Math.floor(val / delta),
				fg = Math.max(0, fvg - head),
				f = d2x * fg,
				nPos = fvg * delta;

			tt.max = Math.max(minMax, Math.min(maxVal, nPos + delta));
			tt.min = (tt.max > minMax) ? tt.max - delta : -Infinity;
			if (tt.max > maxMin) {
				tt.max = Infinity;
			}

			this.first = f;
		}
	},

	/**
	* @private
	*/
	positionChildren: function() {
		var oc = this.orderedChildren,
			e = this.dim2extent,
			v = (this.direction == 'vertical'),
			sd = v ? 'scrollTop' : 'scrollLeft',
			sv = Math.round(this[sd]),
			sp = this.spacing,
			is = this.itemSize,
			is2 = this.itemSize2,
			i, c, idx, g, p, g2, p2, a, b, w, h, fvi, ffvi, lvi, lfvi;

		if (oc) {
			for (i = 0; i < oc.length; i++) {
				c = oc[i];
				idx = c.index;
				g = Math.floor(idx / e);
				g2 = idx % e;
				p = sp + (g * this.delta) - sv;
				p2 = sp + (g2 * this.delta2);
				if (v) {
					a = p2;
					b = p;
					w = is2;
					h = is;
				}
				else {
					a = p;
					b = p2;
					w = is;
					h = is2;
				}
				if (this.rtl) {
					a = -a;
				}
				if (this.sizeItems) {
					c.applyStyle('width', w + 'px');
					c.applyStyle('height', h + 'px');
				}
				if (fvi === undefined && (p + is) > 0) {
					fvi = i;
				}
				if (ffvi === undefined && p >= 0) {
					ffvi = i;
				}
				if ((p + is) <= this.size) {
					lfvi = i;
				}
				if (p < this.size) {
					lvi = i;
				}
				dom.transform(c, {translate3d: a + 'px, ' + b + 'px, 0'});
			}
			this.firstVisibleI = fvi;
			this.lastVisibleI = lvi;
			this.firstFullyVisibleI = ffvi;
			this.lastFullyVisibleI = lfvi;
		}
	},

	// Choosing perf over DRY, so duplicating some positioning
	// logic also implemented in positionChildren()
	/**
	* @private
	*/
	getItemBounds: function (index) {
		var d2x = this.dim2extent,
			sp = this.spacing,
			is = this.itemSize,
			is2 = this.itemSize2,
			g, g2, p, p2;

		g = Math.floor(index / d2x);
		g2 = index % d2x;
		p = sp + (g * this.delta);
		p2 = sp + (g2 * this.delta2);

		return (this.direction == 'vertical')
			? { left: p2, top: p, width: is2, height: is }
			: { left: p, top: p2, width: is, height: is2 }
		;
	},

	/**
	* Providing a NewDataList-specific implementation of the
	* `getChildOffsets()` interface defined by enyo/Scrollable. This
	* implemenation is less expensive than the general implementation
	* provided by Scrollable, and properly accounts for item spacing.
	*
	* @private
	*/
	getChildOffsets: function (child, scrollBounds) {
		var index = this.indexForChild(child),
			offsets = this.getItemBounds(index),
			margin = this.spacing;

		offsets.getMargin = function (side) {
			return margin;
		};

		return offsets;
	},

	/**
	* @private
	*/
	getScrollHeight: function () {
		return (this.direction === 'vertical' ? this.getVirtualScrollDimension() : null);
	},
	/**
	* @private
	*/
	getScrollWidth: function () {
		return (this.direction === 'horizontal' ? this.getVirtualScrollDimension() : null);
	},
	/**
	* @private
	*/
	getVirtualScrollDimension: function() {
		var len = this.collection ? this.collection.length : 0;

		return (Math.ceil(len / this.dim2extent) * this.delta) + this.spacing;
	},

	/**
	* @private
	*/
	modelsAdded: kind.inherit(function (sup) {
		return function() {
			this.calcBoundaries();
			this.refreshThresholds();
			sup.apply(this, arguments);
		};
	}),
	
	/**
	* @private
	*/
	modelsRemoved: kind.inherit(function (sup) {
		return function() {
			this.calcBoundaries();
			this.refreshThresholds();
			sup.apply(this, arguments);
		};
	}),

	/**
	* @private
	*/
	collectionResetHandler: function () {
		this.calcBoundaries();
	},

	/**
	* @private
	*/
	init: kind.inherit(function (sup) {
		return function () {
			var v = (this.direction === 'vertical');

			this.set('scrollTop', 0);
			this.set('scrollLeft', 0);
			this.set('vertical', v ? 'auto' : 'hidden');
			this.set('horizontal', v ? 'hidden' : 'auto');
			this.calculateMetrics();
			this.calcBoundaries();
			this.first = 0;

			sup.apply(this, arguments);
		};
	})
});
