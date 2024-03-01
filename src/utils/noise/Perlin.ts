import NoiseMaker from "./NoiseMaker";

export default class Perlin extends NoiseMaker {
    protected static _instance: Perlin;
  
    constructor(
      octaves: number = 4,
      amplitude: number = 1,
      frequency: number = 1,
      lacunarity: number = 2,
      gain: number = 0.5) {
      super();
  
      this.octaves = octaves;
      this.amplitude = amplitude;
      this.frequency = frequency;
      this.lacunarity = lacunarity;
      this.gain = gain;
      const permutations = Array.from({ length: 256 }, (_, i) => i);
      const gradient1: number[] = [];
      const gradient2: number[][] = [];
  
      for (let i = 0; i < 256; i++) {
        const index = (Math.random() * 256) & 0xFF;
        const value = permutations[index];
        permutations[index] = permutations[i];
        permutations[i] = value;
  
        gradient1[i] = ((Math.random() * 512) - 256) / 256;
  
        gradient2[i] = [];
  
        for (let j = 0; j < 2; j++)
          gradient2[i][j] = ((Math.random() * 512) - 256) / 256;
  
        this.normalize2(gradient2[i]);
      }
  
      this._permutations = permutations.concat(permutations);
      this._gradient1 = gradient1.concat(gradient1);
      this._gradient2 = gradient2.concat(gradient2);
    }
  
    protected _permutations: number[];
    get permutations() { return this._permutations; }
    set permutations(value) { this._permutations = value; }
  
    protected get lowOutput1() { return -Math.sqrt(1 / 4); }
    protected get highOutput1() { return Math.sqrt(1 / 4); }
    protected get lowOutput2() { return -Math.sqrt(2 / 4); }
    protected get highOutput2() { return Math.sqrt(2 / 4); }
  
    protected getValueCore(x: number) {
      const [bx0, bx1, rx0, rx1] = this.setup(x);
      const sx = this.s_curve(rx0);
      const u = rx0 * this._gradient1[this._permutations[bx0]];
      const v = rx1 * this._gradient1[this._permutations[bx1]];
  
      return this.lerp(sx, u, v);
    }
  
    protected getValue2DCore(x: number, y: number) {
      const [bx0, bx1, rx0, rx1] = this.setup(x);
      const [by0, by1, ry0, ry1] = this.setup(y);
  
      const i = this._permutations[bx0];
      const j = this._permutations[bx1];
  
      const b00 = this._permutations[i + by0];
      const b10 = this._permutations[j + by0];
      const b01 = this._permutations[i + by1];
      const b11 = this._permutations[j + by1];
  
      const sx = this.s_curve(rx0);
      const sy = this.s_curve(ry0);
  
      let q: number[];
      q = this._gradient2[b00];
      let u = this.at2(rx0, ry0, q);
      q = this._gradient2[b10];
      let v = this.at2(rx1, ry0, q);
      const a = this.lerp(sx, u, v);
  
      q = this._gradient2[b01];
      u = this.at2(rx0, ry1, q);
      q = this._gradient2[b11];
      v = this.at2(rx1, ry1, q);
      const b = this.lerp(sx, u, v);
  
      return this.lerp(sy, a, b);
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
  
    static init(
      octaves: number = 4,
      amplitude: number = 1,
      frequency: number = 1,
      lacunarity: number = 2,
      gain: number = 0.5) {
      this._instance = new Perlin(octaves, amplitude, frequency, lacunarity, gain);
    }
  
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
      if (this._instance) return;
  
      this.init();
    }
  
    private readonly N = 0x1000;
    private _gradient1!: number[];
    private _gradient2!: number[][];
  
    private s_curve(t: number) { return t * t * (3.0 - 2.0 * t); }
    private lerp(t: number, a: number, b: number) { return a + t * (b - a); }
    private at2(rx: number, ry: number, q: number[]) { return rx * q[0] + ry * q[1]; }
  
    private setup(value: number): [number, number, number, number] {
      const t = value + this.N;
      const b0 = Math.floor(t) & 0xFF;// bx0
      const b1 = (b0 + 1) & 0xFF;     // bx1
      const r0 = t - Math.floor(t);   // rx0
      const r1 = r0 - 1.0;            // rx1
  
      return [b0, b1, r0, r1];
    }
  
    private normalize2(v: number[]) {
      const s = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
      v[0] = v[0] / s;
      v[1] = v[1] / s;
    }
  }