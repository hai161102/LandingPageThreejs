import RangeMapper from "./RangeMapper";

export default abstract class NoiseMaker {
    protected static _instance: NoiseMaker;
    private _mapper1?: RangeMapper;
    private _mapper2?: RangeMapper;
  
    protected MAX_INDEX = 100000000000000;
  
    public octaves: number;
    public amplitude: number;
    public frequency: number;
    public lacunarity: number;
    public gain: number;
  
    public currentIndex: number = 0;
    public step: number = 0.03;
    public scale: number = 1;
  
    get minOutput1() { return this._mapper1 ? this._mapper1.newMin : this.lowOutput1; }
    get maxOutput1() { return this._mapper1 ? this._mapper1.newMax : this.highOutput1; }
    get minOutput2() { return this._mapper2 ? this._mapper2.newMin : this.lowOutput2; }
    get maxOutput2() { return this._mapper2 ? this._mapper2.newMax : this.highOutput2; }
  
    protected get lowOutput1() { return -1; }
    protected get highOutput1() { return 1; }
    protected get lowOutput2() { return this.lowOutput1; }
    protected get highOutput2() { return this.highOutput1; }
  
    resetOutputRange() { this._mapper1 = undefined; }
  
    setOutputRange(min: number, max: number) {
      if (!this._mapper1 || !this._mapper2) {
        this._mapper1 = new RangeMapper(this.lowOutput1, this.highOutput1, min, max);
        this._mapper2 = new RangeMapper(this.lowOutput2, this.highOutput2, min, max);
        return;
      }
  
      this._mapper1.newMin = min;
      this._mapper1.newMax = max;
      this._mapper2.newMin = min;
      this._mapper2.newMax = max;
    }
  
    protected abstract getValueCore(x: number): number;
    protected abstract getValue2DCore(x: number, y: number): number;
  
    getValue(x: number, scale?: number) {
      // scale = scale || this.scale;
      const result = this.getValueCore(x);
      // return this._mapper1 ? this._mapper1.convert(result) : result * scale;
  
      if (scale != undefined)
        return result * scale;
  
      if (this._mapper1)
        return this._mapper1.convert(result);
  
      return result * this.scale;
    }
  
    getValue2D(x: number, y: number, scale?: number) {
      // scale = scale || this.scale;
      const result = this.getValue2DCore(x, y);
      // return this._mapper2 ? this._mapper2.convert(result) : result * scale;
  
      if (scale != undefined)
        return result * scale;
  
      if (this._mapper2)
        return this._mapper2.convert(result);
  
      return result * this.scale;
    }
  
    fractal(
      x: number,
      scale?: number,
      octaves?: number,
      amplitude?: number,
      frequency?: number,
      lacunarity?: number,
      gain?: number) {
  
      octaves = octaves || this.octaves;
      frequency = frequency || this.frequency;
      amplitude = amplitude || this.amplitude;
      lacunarity = lacunarity || this.lacunarity;
      gain = gain || this.gain;
      let output: number = 0;
      let denom: number = 0;
  
      for (let i = 0; i < octaves; i++) {
        output += (amplitude * this.getValue(x * frequency, scale));
  
        denom += amplitude;
        frequency *= lacunarity;
        amplitude *= gain;
      }
  
      return output / denom;
    }
  
    fractal2D(
      x: number,
      y: number,
      scale?: number,
      octaves?: number,
      amplitude?: number,
      frequency?: number,
      lacunarity?: number,
      gain?: number) {
  
      octaves = octaves || this.octaves;
      frequency = frequency || this.frequency;
      amplitude = amplitude || this.amplitude;
      lacunarity = lacunarity || this.lacunarity;
      gain = gain || this.gain;
      let output: number = 0;
      let denom: number = 0;
  
      for (let i = 0; i < octaves; i++) {
        output += (amplitude * this.getValue2D(x * frequency, y * frequency, scale));
  
        denom += amplitude;
        frequency *= lacunarity;
        amplitude *= gain;
      }
  
      return output / denom;
    }
  
    current(scale?: number) {
      // TODO: Ensure wrapping is smooth.
      if (this.currentIndex < -this.MAX_INDEX || this.currentIndex > this.MAX_INDEX)
        this.currentIndex = -this.MAX_INDEX;
  
      return this.getValue(this.currentIndex, scale);
    }
  
    next(scale?: number) {
      this.currentIndex += this.step;
  
      if (this.currentIndex < -this.MAX_INDEX || this.currentIndex > this.MAX_INDEX)
        this.currentIndex = -this.MAX_INDEX;
  
      return this.getValue(this.currentIndex, scale);
    }
  
    currentFractal(
      scale?: number,
      octaves?: number,
      amplitude?: number,
      frequency?: number,
      lacunarity?: number,
      gain?: number) {
  
      if (this.currentIndex < -this.MAX_INDEX || this.currentIndex > this.MAX_INDEX)
        this.currentIndex = -this.MAX_INDEX;
  
      return this.fractal(this.currentIndex, scale, octaves, amplitude, frequency, lacunarity, gain);
    }
  
    nextFractal(
      scale?: number,
      octaves?: number,
      amplitude?: number,
      frequency?: number,
      lacunarity?: number,
      gain?: number) {
  
      this.currentIndex += this.step;
  
      if (this.currentIndex < -this.MAX_INDEX || this.currentIndex > this.MAX_INDEX)
        this.currentIndex = -this.MAX_INDEX;
  
      return this.fractal(this.currentIndex, scale, octaves, amplitude, frequency, lacunarity, gain);
    }
  
    static get octaves() { this.ensureInstance(); return this._instance.octaves; }
    static set octaves(value) { this.ensureInstance(); this._instance.octaves = value; }
    static get amplitude() { this.ensureInstance(); return this._instance.amplitude; }
    static set amplitude(value) { this.ensureInstance(); this._instance.amplitude = value; }
    static get frequency() { this.ensureInstance(); return this._instance.frequency; }
    static set frequency(value) { this.ensureInstance(); this._instance.frequency = value; }
    static get lacunarity() { this.ensureInstance(); return this._instance.lacunarity; }
    static set lacunarity(value) { this.ensureInstance(); this._instance.lacunarity = value; }
    static get gain() { this.ensureInstance(); return this._instance.gain; }
    static set gain(value) { this.ensureInstance(); this._instance.gain = value; }
  
    static initialize(instance: NoiseMaker) { this._instance = instance; }
  
    static getValue(x: number, scale?: number) {
      this.ensureInstance();
      return this._instance.getValue(x, scale);
    }
  
    static fractal(
      x: number,
      scale?: number,
      octaves?: number,
      amplitude?: number,
      frequency?: number,
      lacunarity?: number,
      gain?: number) {
  
      this.ensureInstance();
      return this._instance.fractal(x, scale, octaves, amplitude, frequency, lacunarity, gain);
    }
  
    protected static ensureInstance() {
      if (!this._instance)
        throw new Error(`Must call "initialize" before accessing static members.`);
    }
  }
  