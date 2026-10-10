export type DemoQuestion = { prompt: string; options: string[]; answer: number; explanation: string };
export type DemoTest = { id: string; title: string; exam: string; subject: string; minutes: number; questions: DemoQuestion[] };

const q = (prompt: string, options: string[], answer: number, explanation: string): DemoQuestion => ({ prompt, options, answer, explanation });

export const demoTests: DemoTest[] = [
  {
    id: "biology-core", title: "Biology: cells & systems", exam: "MDCAT", subject: "Biology", minutes: 12,
    questions: [
      q("Which organelle is the main site of aerobic respiration?", ["Ribosome", "Mitochondrion", "Golgi apparatus", "Lysosome"], 1, "Mitochondria host the Krebs cycle and oxidative phosphorylation, producing most cellular ATP."),
      q("A peptide bond forms between which groups?", ["Two phosphate groups", "Amino and carboxyl groups", "Two hydroxyl groups", "A sugar and a base"], 1, "The carboxyl group of one amino acid joins the amino group of another by condensation."),
      q("In a typical enzyme reaction, lowering activation energy mainly changes the…", ["Equilibrium constant", "Rate of reaching equilibrium", "Products’ free energy", "Overall enthalpy change"], 1, "Catalysts speed both forward and reverse reactions without changing equilibrium or net energy change."),
      q("Which blood component is chiefly responsible for oxygen transport?", ["Platelets", "Plasma proteins", "Erythrocytes", "Lymphocytes"], 2, "Haemoglobin inside erythrocytes binds oxygen reversibly in the lungs and releases it in tissues."),
      q("Crossing over normally occurs during…", ["Prophase I of meiosis", "Metaphase of mitosis", "Anaphase II", "Cytokinesis"], 0, "Homologous chromosomes pair and exchange segments during prophase I, increasing variation."),
      q("Which vessel carries oxygenated blood from the lungs to the heart?", ["Pulmonary artery", "Aorta", "Pulmonary vein", "Vena cava"], 2, "Pulmonary veins return oxygenated blood to the left atrium; the pulmonary artery carries blood toward the lungs."),
      q("A recessive phenotype appears in a heterozygote when…", ["The allele is dominant", "The second allele is also recessive", "Crossing over occurs", "The gene is on a chromosome"], 1, "A recessive phenotype usually requires two recessive alleles in a diploid organism."),
      q("What is the net product of glycolysis per glucose molecule?", ["2 pyruvate and 2 ATP", "1 pyruvate and 4 ATP", "2 acetyl-CoA and 2 NADH", "6 CO₂ and 6 H₂O"], 0, "Glycolysis yields two pyruvate, two net ATP and two NADH per glucose."),
    ],
  },
  {
    id: "physics-motion", title: "Physics: motion & energy", exam: "MDCAT", subject: "Physics", minutes: 10,
    questions: [
      q("A body starts from rest and accelerates at 2 m/s² for 5 s. Its final speed is…", ["2 m/s", "5 m/s", "10 m/s", "25 m/s"], 2, "Using v = u + at gives v = 0 + (2)(5) = 10 m/s."),
      q("The slope of a displacement–time graph represents…", ["Acceleration", "Velocity", "Force", "Momentum"], 1, "Velocity is the rate of change of displacement with time, so it is the graph’s slope."),
      q("Which quantity is conserved in an isolated elastic collision?", ["Momentum only", "Kinetic energy only", "Both momentum and kinetic energy", "Neither"], 2, "An isolated elastic collision conserves total momentum and total kinetic energy."),
      q("The SI unit of electric potential difference is…", ["Coulomb", "Ampere", "Volt", "Ohm"], 2, "One volt is one joule of energy per coulomb of charge."),
      q("If the frequency of a wave doubles while its speed stays fixed, its wavelength…", ["Doubles", "Halves", "Stays fixed", "Becomes zero"], 1, "From v = fλ, fixed speed means wavelength varies inversely with frequency."),
      q("A 2 kg object is lifted 3 m. Taking g = 10 m/s², its gain in gravitational potential energy is…", ["6 J", "15 J", "60 J", "600 J"], 2, "ΔU = mgh = 2 × 10 × 3 = 60 J."),
      q("For resistors in series, the equivalent resistance is…", ["The reciprocal sum", "The sum of resistances", "Always zero", "The largest resistance only"], 1, "Series components carry the same current and their voltage drops add, so resistances sum."),
      q("A convex lens forms a real image when the object is placed…", ["Between lens and focus", "At the optical centre", "Beyond the focal length", "At infinity only"], 2, "An object outside the focal length of a converging lens forms a real, inverted image."),
    ],
  },
  {
    id: "chemistry-basics", title: "Chemistry: atoms & bonding", exam: "MDCAT", subject: "Chemistry", minutes: 10,
    questions: [
      q("The atomic number of an element equals its number of…", ["Neutrons", "Protons", "Nucleons", "Isotopes"], 1, "Atomic number is defined as the number of protons in the nucleus."),
      q("Which bond results from sharing an electron pair?", ["Ionic", "Covalent", "Metallic", "Hydrogen"], 1, "Covalent bonds form when atoms share electron pairs."),
      q("At 25°C, a neutral aqueous solution has pH…", ["0", "5", "7", "14"], 2, "At 25°C, neutral water has equal hydrogen and hydroxide ion concentrations and pH 7."),
      q("How many moles are in 18 g of water (M = 18 g/mol)?", ["0.5 mol", "1 mol", "2 mol", "18 mol"], 1, "Moles = mass ÷ molar mass = 18 ÷ 18 = 1 mol."),
      q("Oxidation is best described as…", ["Gain of electrons", "Loss of electrons", "Gain of neutrons", "Loss of protons"], 1, "Oxidation is loss of electrons; reduction is gain of electrons."),
      q("Which gas is produced when an acid reacts with a carbonate?", ["Hydrogen", "Oxygen", "Carbon dioxide", "Nitrogen"], 2, "Acid + carbonate produces a salt, water and carbon dioxide."),
      q("A catalyst increases reaction rate by…", ["Raising activation energy", "Lowering activation energy", "Increasing product energy", "Being consumed"], 1, "A catalyst provides an alternative pathway with lower activation energy and is regenerated."),
      q("Across a period in the periodic table, atomic radius generally…", ["Increases", "Decreases", "Does not change", "First doubles"], 1, "Increasing nuclear charge pulls electrons closer while electrons enter the same main shell."),
    ],
  },
];

export type DemoProduct = { id: string; title: string; exam: string; subject: string; kind: "Practice test" | "Study guide"; description: string; creator: string; rating: number; downloads: number; tags: string[]; testId?: string; featured?: boolean };

export const demoProducts: DemoProduct[] = [
  { id: "p-bio", title: "Biology: cells & systems", exam: "MDCAT", subject: "Biology", kind: "Practice test", description: "Eight original questions on cell biology, genetics, blood and respiration. Includes worked explanations after you submit.", creator: "Aptivo demo team", rating: 4.9, downloads: 1240, tags: ["8 questions", "12 min", "Explanations"], testId: "biology-core", featured: true },
  { id: "p-physics", title: "Physics: motion & energy", exam: "MDCAT", subject: "Physics", kind: "Practice test", description: "Build confidence with motion graphs, energy, waves, circuits and lenses.", creator: "Aptivo demo team", rating: 4.8, downloads: 980, tags: ["8 questions", "10 min", "Explanations"], testId: "physics-motion" },
  { id: "p-chem", title: "Chemistry: atoms & bonding", exam: "MDCAT", subject: "Chemistry", kind: "Practice test", description: "A focused warm-up across atomic structure, bonding, acids, redox and periodic trends.", creator: "Aptivo demo team", rating: 4.8, downloads: 765, tags: ["8 questions", "10 min", "Explanations"], testId: "chemistry-basics" },
  { id: "p-guide", title: "The calm exam-week checklist", exam: "All exams", subject: "Study skills", kind: "Study guide", description: "A short, practical plan for revision blocks, sleep, materials and a steady test-day routine.", creator: "Aptivo demo team", rating: 4.7, downloads: 1540, tags: ["Free guide", "6 min read", "Checklist"] },
];
