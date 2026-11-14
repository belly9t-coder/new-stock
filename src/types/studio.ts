export type StudioMode = 'home' | 'torn-paper' | 'paint';

export type TornPaperStyle =
  | 'split-gap'
  | 'horizontal-strip'
  | 'ripped-edge'
  | 'irregular-scrap'
  | 'diagonal-cut'
  | 'layered-strips'
  | 'torn-frame';

export type PaintStyle =
  | 'dry-brush'
  | 'ink-splatter'
  | 'palette-knife'
  | 'watercolor-edge'
  | 'paint-drip';

export type AspectRatioPreset = '16:9' | '1:1' | '4:5' | '9:16';

export type ExportResolution = '4k' | '8k';

export type PreviewBackdrop = 'checker-light' | 'checker-dark' | 'white' | 'charcoal';

export type GrainScale = 'fine' | 'medium' | 'coarse';

export type ColorMode = 'solid' | 'gradient';

export type GradientType = 'linear' | 'radial';

export interface Point {
  x: number;
  y: number;
}

export interface VectorLayer {
  id: string;
  label: string;
  pathData: string;
  pointsList: Point[][];
  fill: string;
  opacity?: number;
  fillRule?: 'nonzero' | 'evenodd';
}

export interface GeneratedDesign {
  designId: string;
  seedWords: [number, number, number, number];
  mode: 'torn-paper' | 'paint';
  style: TornPaperStyle | PaintStyle;
  aspectRatio: AspectRatioPreset;
  viewBoxWidth: number;
  viewBoxHeight: number;
  layers: VectorLayer[];
  nodeCount: number;
  createdAt: number;
}

export interface StudioConfig {
  mode: 'torn-paper' | 'paint';
  tornStyle: TornPaperStyle;
  paintStyle: PaintStyle;
  colorMode: ColorMode;
  color: string;
  gradientColor2: string;
  gradientType: GradientType;
  gradientAngle: number; // 0 to 360
  grainEnabled: boolean;
  grainIntensity: number; // 10 to 100
  grainScale: GrainScale;
  roughness: number; // 15 to 100
  detailDensity: number; // 20 to 100
  thickness: number; // 12 to 88
  deckleHighlight: boolean;
  deckleOpacity: number; // 10 to 100
  shadowEnabled: boolean;
  shadowOpacity: number; // 5 to 100
  shadowBlur: number; // 4 to 48
  aspectRatio: AspectRatioPreset;
  backdrop: PreviewBackdrop;
}

export interface ResolutionSpec {
  width4k: number;
  height4k: number;
  width8k: number;
  height8k: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  label: string;
}

export const ASPECT_RATIO_SPECS: Record<AspectRatioPreset, ResolutionSpec> = {
  '16:9': {
    width4k: 3840,
    height4k: 2160,
    width8k: 7680,
    height8k: 4320,
    viewBoxWidth: 1920,
    viewBoxHeight: 1080,
    label: '১৬:৯ ওয়াইড',
  },
  '1:1': {
    width4k: 4096,
    height4k: 4096,
    width8k: 8192,
    height8k: 8192,
    viewBoxWidth: 1600,
    viewBoxHeight: 1600,
    label: '১:১ স্কয়ার',
  },
  '4:5': {
    width4k: 3240,
    height4k: 4050,
    width8k: 6480,
    height8k: 8100,
    viewBoxWidth: 1440,
    viewBoxHeight: 1800,
    label: '৪:৫ পোর্ট্রেট',
  },
  '9:16': {
    width4k: 2160,
    height4k: 3840,
    width8k: 4320,
    height8k: 7680,
    viewBoxWidth: 1080,
    viewBoxHeight: 1920,
    label: '৯:১৬ ভার্টিকাল',
  },
};

export interface StyleOption<T extends string> {
  id: T;
  nameBn: string;
  nameEn: string;
  descriptionBn: string;
}

export const TORN_PAPER_STYLES: StyleOption<TornPaperStyle>[] = [
  {
    id: 'split-gap',
    nameBn: 'উপর-নিচ ছেঁড়া (মাঝে ফাঁকা)',
    nameEn: 'Split Gap Tear',
    descriptionBn: 'উপরে ও নিচে ছেঁড়া কাগজ এবং মাঝখানে স্বচ্ছ ফাঁকা অংশ (পুরুত্ব নিয়ন্ত্রণযোগ্য)',
  },
  {
    id: 'horizontal-strip',
    nameBn: 'আনুভূমিক ফালি',
    nameEn: 'Torn Strip',
    descriptionBn: 'উপরে ও নিচে প্রাকৃতিক ফাইবারযুক্ত ছেঁড়া কাগজের ব্যান্ড',
  },
  {
    id: 'ripped-edge',
    nameBn: 'এক প্রান্ত ছেঁড়া পাতা',
    nameEn: 'Ripped Edge Sheet',
    descriptionBn: 'তিন দিক সোজা এবং এক প্রান্ত গভীরভাবে ছেঁড়া শিট',
  },
  {
    id: 'irregular-scrap',
    nameBn: 'অর্গানিক কাগজের টুকরো',
    nameEn: 'Paper Scrap',
    descriptionBn: 'চারপাশ এলোমেলোভাবে ছেঁড়া স্বতন্ত্র কাগজের স্ক্র্যাপ',
  },
  {
    id: 'diagonal-cut',
    nameBn: 'তির্যক ছেঁড়া',
    nameEn: 'Diagonal Tear',
    descriptionBn: 'কৌণিক ডায়নামিক ছেঁড়া কাগজের স্ট্রিপ ও কর্নার',
  },
  {
    id: 'layered-strips',
    nameBn: 'স্তরযুক্ত কাগজ',
    nameEn: 'Layered Tears',
    descriptionBn: 'একাধিক ওভারল্যাপিং ছেঁড়া স্তর (আলাদা ভেক্টর পাথসহ)',
  },
  {
    id: 'torn-frame',
    nameBn: 'ছেঁড়া ফ্রেম উইন্ডো',
    nameEn: 'Torn Frame',
    descriptionBn: 'ভেতরের অংশ ছেঁড়া খালি উইন্ডো ফ্রেম ওভারলে',
  },
];

export const PAINT_STYLES: StyleOption<PaintStyle>[] = [
  {
    id: 'dry-brush',
    nameBn: 'ড্রাই ব্রাশ স্ট্রোক',
    nameEn: 'Dry Brush',
    descriptionBn: 'রঙের সূক্ষ্ম ব্রিসল ও রুক্ষ প্রান্তযুক্ত ব্রাশ স্ট্রোক',
  },
  {
    id: 'ink-splatter',
    nameBn: 'ইংক স্প্ল্যাটার',
    nameEn: 'Ink Splatter',
    descriptionBn: 'কেন্দ্রীয় স্প্ল্যাশ ও চারপাশে ছড়ানো রঙের ছিটা',
  },
  {
    id: 'palette-knife',
    nameBn: 'প্যালেট নাইফ স্মিয়ার',
    nameEn: 'Palette Knife',
    descriptionBn: 'ঘন অ্যাক্রিলিক রঙের ধারালো স্প্যাচুলা টেক্সচার',
  },
  {
    id: 'watercolor-edge',
    nameBn: 'জলরঙের ছাপ',
    nameEn: 'Organic Wash',
    descriptionBn: 'প্রবাহী জৈব প্রান্তসহ রঙের স্প্লচ',
  },
  {
    id: 'paint-drip',
    nameBn: 'পেইন্ট ড্রিপ',
    nameEn: 'Paint Drip',
    descriptionBn: 'উপরে ঘন রঙ এবং নিচে গড়িয়ে পড়া ফোঁটার স্ট্রোক',
  },
];

export const SOLID_SWATCHES: { name: string; hex: string }[] = [
  { name: 'আর্কাইভাল সাদা', hex: '#F7F5EE' },
  { name: 'শুদ্ধ সাদা', hex: '#FFFFFF' },
  { name: 'ক্রাফট ব্রাউন', hex: '#C79F73' },
  { name: 'নিউজপ্রিন্ট গ্রে', hex: '#D6D3CB' },
  { name: 'অবসিডিয়ান কালো', hex: '#141413' },
  { name: 'ভারমিলিয়ন লাল', hex: '#D94826' },
  { name: 'কোবাল্ট নীল', hex: '#1E40AF' },
  { name: 'সেইজ সবুজ', hex: '#4D7C5D' },
  { name: 'ওকার হলুদ', hex: '#D99B26' },
  { name: 'টেরাকোটা', hex: '#B8543A' },
  { name: 'ডিপ প্লাম', hex: '#4A2545' },
  { name: 'টিল ব্লু', hex: '#16697A' },
];

export interface GradientPreset {
  name: string;
  c1: string;
  c2: string;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { name: 'চারকোল স্মোক', c1: '#686662', c2: '#232220' },
  { name: 'আর্কাইভাল ক্রিম', c1: '#FAF8F1', c2: '#DDD7C8' },
  { name: 'ভারমিলিয়ন ডাস্ক', c1: '#E55D3B', c2: '#8B2210' },
  { name: 'ওশান স্লেট', c1: '#2A548A', c2: '#101D33' },
  { name: 'সেইজ ফরেস্ট', c1: '#6D987B', c2: '#2C4937' },
  { name: 'গোল্ডেন ওকার', c1: '#EAB344', c2: '#A16207' },
  { name: 'রয়্যাল প্লাম', c1: '#7C4575', c2: '#2E162C' },
  { name: 'ক্রাফট স্যান্ড', c1: '#D9B88F', c2: '#8F6842' },
];
