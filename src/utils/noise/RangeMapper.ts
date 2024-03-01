export default class RangeMapper {
    private _slope!: number;
    private _intercept!: number;
    private _dirty: boolean;
  
    constructor(
      private _min: number,
      private _max: number,
      private _newMin: number,
      private _newMax: number) {
      this._dirty = true;
    }
    get min() { return this._min; }
    set min(value) {
      this._min = value;
      this._dirty = true;
    }
  
    get max() { return this._max; }
    set max(value) {
      this._max = value;
      this._dirty = true;
    }
  
    get newMin() { return this._newMin; }
    set newMin(value) {
      this._newMin = value;
      this._dirty = true;
    }
  
    get newMax() { return this._newMax; }
    set newMax(value) {
      this._newMax = value;
      this._dirty = true;
    }
  
    convert(value: number) {
      if (this._dirty)
        this.calcSlopeIntercept();
  
      return value * this._slope + this._intercept;
    }
  
    private calcSlopeIntercept() {
      let run = this.max - this.min;
  
      if (run === 0) run = 1;
  
      this._slope = (this.newMax - this.newMin) / run;
      this._intercept = this.newMax - (this._slope * this.max);
      this._dirty = false;
    }
  }