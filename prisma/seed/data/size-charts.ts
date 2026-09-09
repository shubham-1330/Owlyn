export type SizeChartSeed = {
  key: string;
  name: string;
  rows: { columns: string[]; rows: string[][]; note?: string };
};

export const sizeCharts: SizeChartSeed[] = [
  {
    key: "footwear-men",
    name: "Footwear, men",
    rows: {
      columns: ["UK", "EU", "US", "Foot length (cm)"],
      rows: [
        ["6", "40", "7", "25.0"],
        ["7", "41", "8", "25.8"],
        ["8", "42", "9", "26.7"],
        ["9", "43", "10", "27.5"],
        ["10", "44", "11", "28.3"],
        ["11", "45", "12", "29.2"],
      ],
      note: "Measure standing, heel to longest toe, at the end of the day. Between sizes, go up.",
    },
  },
  {
    key: "footwear-women",
    name: "Footwear, women",
    rows: {
      columns: ["UK", "EU", "US", "Foot length (cm)"],
      rows: [
        ["3", "36", "5", "22.5"],
        ["4", "37", "6", "23.3"],
        ["5", "38", "7", "24.1"],
        ["6", "39", "8", "25.0"],
        ["7", "40", "9", "25.8"],
        ["8", "41", "10", "26.7"],
      ],
      note: "Measure standing, heel to longest toe, at the end of the day. Between sizes, go up.",
    },
  },
  {
    key: "tops-men",
    name: "Tops, men",
    rows: {
      columns: ["Size", "Chest (cm)", "Body length (cm)", "Sleeve (cm)"],
      rows: [
        ["S", "96", "69", "20"],
        ["M", "102", "71", "21"],
        ["L", "108", "73", "22"],
        ["XL", "114", "75", "23"],
        ["XXL", "120", "77", "24"],
      ],
      note: "Garment measurements, laid flat and doubled for chest. Regular fit has 8 to 10 cm of ease.",
    },
  },
  {
    key: "tops-women",
    name: "Tops, women",
    rows: {
      columns: ["Size", "Bust (cm)", "Body length (cm)", "Sleeve (cm)"],
      rows: [
        ["XS", "84", "60", "17"],
        ["S", "90", "62", "18"],
        ["M", "96", "64", "19"],
        ["L", "102", "66", "20"],
        ["XL", "108", "68", "21"],
      ],
      note: "Garment measurements, laid flat and doubled for bust. Regular fit has 6 to 8 cm of ease.",
    },
  },
  {
    key: "bottoms-men",
    name: "Bottoms, men",
    rows: {
      columns: ["Size", "Waist (cm)", "Hip (cm)", "Inseam (cm)"],
      rows: [
        ["S", "76", "96", "78"],
        ["M", "82", "102", "80"],
        ["L", "88", "108", "81"],
        ["XL", "94", "114", "82"],
        ["XXL", "100", "120", "83"],
      ],
      note: "Waist is the relaxed elastic. Inseam given for joggers; shorts are listed on the product.",
    },
  },
  {
    key: "bottoms-women",
    name: "Bottoms, women",
    rows: {
      columns: ["Size", "Waist (cm)", "Hip (cm)", "Inseam (cm)"],
      rows: [
        ["XS", "64", "88", "70"],
        ["S", "70", "94", "71"],
        ["M", "76", "100", "72"],
        ["L", "82", "106", "73"],
        ["XL", "88", "112", "74"],
      ],
      note: "Waist is the relaxed elastic. Inseam given for joggers; shorts are listed on the product.",
    },
  },
];
