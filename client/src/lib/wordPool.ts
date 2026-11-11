/**
 * Word pool — only concrete things you can actually DRAW, grouped by clear themes
 * (animals, food, objects, nature & places, characters, love). "Karışık" mixes them all.
 *
 * Every word has an emoji that is shown on the result screen next to the
 * players' drawing ("what it should have looked like").
 */

import type { Locale } from "./i18n";

export type WordCategory = "mixed" | "animals" | "food" | "objects" | "places" | "people" | "love";

export interface WordEntry {
  id: number;
  tr: string;
  en: string;
  de: string;
  es: string;
  /** Reference picture shown after the round. */
  emoji: string;
}

export interface CategoryInfo {
  id: WordCategory;
  emoji: string;
  premium: boolean;
  nameKey: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: "mixed", emoji: "🎲", premium: false, nameKey: "cat.mixed" },
  { id: "animals", emoji: "🐾", premium: false, nameKey: "cat.animals" },
  { id: "food", emoji: "🍕", premium: false, nameKey: "cat.food" },
  { id: "objects", emoji: "🎒", premium: false, nameKey: "cat.objects" },
  { id: "places", emoji: "🌳", premium: false, nameKey: "cat.places" },
  { id: "love", emoji: "💕", premium: false, nameKey: "cat.love" },
];

const LEGACY: Record<string, WordCategory> = { daily: "mixed", funny: "mixed", hard: "mixed", spicy: "love", romantic: "love", daily_challenge: "mixed" };

/** Any stored/old category id → a valid one ("funny" from an old phone → "mixed"). */
export function normalizeCategory(value: unknown): WordCategory {
  const id = String(value || "");
  if (CATEGORIES.some((category) => category.id === id) || id === "people") return id as WordCategory;
  return LEGACY[id] || "mixed";
}

const ANIMAL_WORDS: WordEntry[] = [
  { id: 1, tr: "Köpek", en: "Dog", de: "Hund", es: "Perro", emoji: "🐶" },
  { id: 2, tr: "Kedi", en: "Cat", de: "Katze", es: "Gato", emoji: "🐱" },
  { id: 3, tr: "Kuş", en: "Bird", de: "Vogel", es: "Pájaro", emoji: "🐦" },
  { id: 4, tr: "Balık", en: "Fish", de: "Fisch", es: "Pez", emoji: "🐟" },
  { id: 5, tr: "Kelebek", en: "Butterfly", de: "Schmetterling", es: "Mariposa", emoji: "🦋" },
  { id: 6, tr: "Karınca", en: "Ant", de: "Ameise", es: "Hormiga", emoji: "🐜" },
  { id: 7, tr: "Örümcek", en: "Spider", de: "Spinne", es: "Araña", emoji: "🕷️" },
  { id: 8, tr: "Tavuk", en: "Chicken", de: "Huhn", es: "Gallina", emoji: "🐔" },
  { id: 9, tr: "İnek", en: "Cow", de: "Kuh", es: "Vaca", emoji: "🐄" },
  { id: 10, tr: "At", en: "Horse", de: "Pferd", es: "Caballo", emoji: "🐴" },
  { id: 11, tr: "Fil", en: "Elephant", de: "Elefant", es: "Elefante", emoji: "🐘" },
  { id: 12, tr: "Aslan", en: "Lion", de: "Löwe", es: "León", emoji: "🦁" },
  { id: 13, tr: "Maymun", en: "Monkey", de: "Affe", es: "Mono", emoji: "🐒" },
  { id: 14, tr: "Penguen", en: "Penguin", de: "Pinguin", es: "Pingüino", emoji: "🐧" },
  { id: 15, tr: "Timsah", en: "Crocodile", de: "Krokodil", es: "Cocodrilo", emoji: "🐊" },
  { id: 16, tr: "Yılan", en: "Snake", de: "Schlange", es: "Serpiente", emoji: "🐍" },
  { id: 17, tr: "Kaplumbağa", en: "Turtle", de: "Schildkröte", es: "Tortuga", emoji: "🐢" },
  { id: 18, tr: "Tavşan", en: "Rabbit", de: "Hase", es: "Conejo", emoji: "🐰" },
  { id: 19, tr: "Ahtapot", en: "Octopus", de: "Krake", es: "Pulpo", emoji: "🐙" },
  { id: 20, tr: "Köpekbalığı", en: "Shark", de: "Hai", es: "Tiburón", emoji: "🦈" },
  { id: 21, tr: "Balina", en: "Whale", de: "Wal", es: "Ballena", emoji: "🐳" },
  { id: 22, tr: "Zürafa", en: "Giraffe", de: "Giraffe", es: "Jirafa", emoji: "🦒" },
  { id: 23, tr: "Domuz", en: "Pig", de: "Schwein", es: "Cerdo", emoji: "🐷" },
  { id: 24, tr: "Arı", en: "Bee", de: "Biene", es: "Abeja", emoji: "🐝" },
  { id: 25, tr: "Salyangoz", en: "Snail", de: "Schnecke", es: "Caracol", emoji: "🐌" },
  { id: 26, tr: "Baykuş", en: "Owl", de: "Eule", es: "Búho", emoji: "🦉" },
  { id: 27, tr: "Kuğu", en: "Swan", de: "Schwan", es: "Cisne", emoji: "🦢" },
  { id: 28, tr: "Kurbağa", en: "Frog", de: "Frosch", es: "Rana", emoji: "🐸" },
  { id: 29, tr: "Tembel hayvan", en: "Sloth", de: "Faultier", es: "Perezoso", emoji: "🦥" },
  { id: 30, tr: "Lama", en: "Llama", de: "Lama", es: "Llama", emoji: "🦙" },
  { id: 31, tr: "Kanguru", en: "Kangaroo", de: "Känguru", es: "Canguro", emoji: "🦘" },
  { id: 32, tr: "Tavus kuşu", en: "Peacock", de: "Pfau", es: "Pavo real", emoji: "🦚" },
  { id: 33, tr: "Sinek", en: "Fly", de: "Fliege", es: "Mosca", emoji: "🪰" },
  { id: 34, tr: "Solucan", en: "Worm", de: "Wurm", es: "Gusano", emoji: "🪱" },
  { id: 35, tr: "Dinozor", en: "Dinosaur", de: "Dinosaurier", es: "Dinosaurio", emoji: "🦖" },
];

const FOOD_WORDS: WordEntry[] = [
  { id: 1001, tr: "Kahve", en: "Coffee", de: "Kaffee", es: "Café", emoji: "☕" },
  { id: 1002, tr: "Pizza", en: "Pizza", de: "Pizza", es: "Pizza", emoji: "🍕" },
  { id: 1003, tr: "Ekmek", en: "Bread", de: "Brot", es: "Pan", emoji: "🍞" },
  { id: 1004, tr: "Peynir", en: "Cheese", de: "Käse", es: "Queso", emoji: "🧀" },
  { id: 1005, tr: "Yumurta", en: "Egg", de: "Ei", es: "Huevo", emoji: "🥚" },
  { id: 1006, tr: "Süt", en: "Milk", de: "Milch", es: "Leche", emoji: "🥛" },
  { id: 1007, tr: "Hamburger", en: "Hamburger", de: "Hamburger", es: "Hamburguesa", emoji: "🍔" },
  { id: 1008, tr: "Dondurma", en: "Ice cream", de: "Eis", es: "Helado", emoji: "🍦" },
  { id: 1009, tr: "Doğum günü pastası", en: "Birthday cake", de: "Geburtstagstorte", es: "Pastel de cumpleaños", emoji: "🎂" },
  { id: 1010, tr: "Patates", en: "Potato", de: "Kartoffel", es: "Patata", emoji: "🥔" },
  { id: 1011, tr: "Domates", en: "Tomato", de: "Tomate", es: "Tomate", emoji: "🍅" },
  { id: 1012, tr: "Elma", en: "Apple", de: "Apfel", es: "Manzana", emoji: "🍎" },
  { id: 1013, tr: "Muz", en: "Banana", de: "Banane", es: "Plátano", emoji: "🍌" },
  { id: 1014, tr: "Çilek", en: "Strawberry", de: "Erdbeere", es: "Fresa", emoji: "🍓" },
  { id: 1015, tr: "Karpuz", en: "Watermelon", de: "Wassermelone", es: "Sandía", emoji: "🍉" },
  { id: 1016, tr: "Üzüm", en: "Grapes", de: "Trauben", es: "Uvas", emoji: "🍇" },
  { id: 1017, tr: "Limon", en: "Lemon", de: "Zitrone", es: "Limón", emoji: "🍋" },
  { id: 1018, tr: "Havuç", en: "Carrot", de: "Karotte", es: "Zanahoria", emoji: "🥕" },
  { id: 1019, tr: "Mantar", en: "Mushroom", de: "Pilz", es: "Seta", emoji: "🍄" },
  { id: 1020, tr: "Ananas", en: "Pineapple", de: "Ananas", es: "Piña", emoji: "🍍" },
  { id: 1021, tr: "Kiraz", en: "Cherry", de: "Kirsche", es: "Cereza", emoji: "🍒" },
  { id: 1022, tr: "Mısır", en: "Corn", de: "Mais", es: "Maíz", emoji: "🌽" },
  { id: 1023, tr: "Sosisli sandviç", en: "Hot dog", de: "Hotdog", es: "Perrito caliente", emoji: "🌭" },
  { id: 1024, tr: "Kurabiye", en: "Cookie", de: "Keks", es: "Galleta", emoji: "🍪" },
  { id: 1025, tr: "Çikolata", en: "Chocolate", de: "Schokolade", es: "Chocolate", emoji: "🍫" },
  { id: 1026, tr: "Bal", en: "Honey", de: "Honig", es: "Miel", emoji: "🍯" },
  { id: 1027, tr: "Pamuk şeker", en: "Cotton candy", de: "Zuckerwatte", es: "Algodón de azúcar", emoji: "🍭" },
  { id: 1028, tr: "Lolipop", en: "Lollipop", de: "Lutscher", es: "Piruleta", emoji: "🍭" },
  { id: 1029, tr: "Patlamış mısır", en: "Popcorn", de: "Popcorn", es: "Palomitas", emoji: "🍿" },
  { id: 1030, tr: "Acı biber", en: "Chili pepper", de: "Chilischote", es: "Chile", emoji: "🌶️" },
  { id: 1031, tr: "Şeftali", en: "Peach", de: "Pfirsich", es: "Melocotón", emoji: "🍑" },
  { id: 1032, tr: "Patlıcan", en: "Eggplant", de: "Aubergine", es: "Berenjena", emoji: "🍆" },
  { id: 1033, tr: "Kokteyl", en: "Cocktail", de: "Cocktail", es: "Cóctel", emoji: "🍸" },
  { id: 1034, tr: "Şampanya", en: "Champagne", de: "Champagner", es: "Champán", emoji: "🍾" },
  { id: 1035, tr: "Sıcak çikolata", en: "Hot chocolate", de: "Heiße Schokolade", es: "Chocolate caliente", emoji: "☕" },
  { id: 1036, tr: "Düğün pastası", en: "Wedding cake", de: "Hochzeitstorte", es: "Pastel de boda", emoji: "🎂" },
  { id: 1037, tr: "Fal kurabiyesi", en: "Fortune cookie", de: "Glückskeks", es: "Galleta de la fortuna", emoji: "🥠" },
];

const OBJECT_WORDS: WordEntry[] = [
  { id: 2001, tr: "Telefon", en: "Phone", de: "Telefon", es: "Teléfono", emoji: "📱" },
  { id: 2002, tr: "Şemsiye", en: "Umbrella", de: "Regenschirm", es: "Paraguas", emoji: "☂️" },
  { id: 2003, tr: "Kitap", en: "Book", de: "Buch", es: "Libro", emoji: "📖" },
  { id: 2004, tr: "Balon", en: "Balloon", de: "Luftballon", es: "Globo", emoji: "🎈" },
  { id: 2005, tr: "Anahtar", en: "Key", de: "Schlüssel", es: "Llave", emoji: "🔑" },
  { id: 2006, tr: "Çalar saat", en: "Alarm clock", de: "Wecker", es: "Despertador", emoji: "⏰" },
  { id: 2007, tr: "Gözlük", en: "Glasses", de: "Brille", es: "Gafas", emoji: "👓" },
  { id: 2008, tr: "Şapka", en: "Hat", de: "Hut", es: "Sombrero", emoji: "🎩" },
  { id: 2009, tr: "Spor ayakkabı", en: "Sneaker", de: "Turnschuh", es: "Zapatilla", emoji: "👟" },
  { id: 2010, tr: "Çanta", en: "Handbag", de: "Handtasche", es: "Bolso", emoji: "👜" },
  { id: 2011, tr: "Fotoğraf makinesi", en: "Camera", de: "Kamera", es: "Cámara", emoji: "📷" },
  { id: 2012, tr: "Televizyon", en: "Television", de: "Fernseher", es: "Televisión", emoji: "📺" },
  { id: 2013, tr: "Bilgisayar", en: "Laptop", de: "Laptop", es: "Portátil", emoji: "💻" },
  { id: 2014, tr: "Kulaklık", en: "Headphones", de: "Kopfhörer", es: "Auriculares", emoji: "🎧" },
  { id: 2015, tr: "Mum", en: "Candle", de: "Kerze", es: "Vela", emoji: "🕯️" },
  { id: 2016, tr: "Kapı", en: "Door", de: "Tür", es: "Puerta", emoji: "🚪" },
  { id: 2017, tr: "Sandalye", en: "Chair", de: "Stuhl", es: "Silla", emoji: "🪑" },
  { id: 2018, tr: "Yatak", en: "Bed", de: "Bett", es: "Cama", emoji: "🛏️" },
  { id: 2019, tr: "Kaşık", en: "Spoon", de: "Löffel", es: "Cuchara", emoji: "🥄" },
  { id: 2020, tr: "Bıçak", en: "Knife", de: "Messer", es: "Cuchillo", emoji: "🔪" },
  { id: 2021, tr: "Ampul", en: "Light bulb", de: "Glühbirne", es: "Bombilla", emoji: "💡" },
  { id: 2022, tr: "Makas", en: "Scissors", de: "Schere", es: "Tijeras", emoji: "✂️" },
  { id: 2023, tr: "Kalem", en: "Pencil", de: "Bleistift", es: "Lápiz", emoji: "✏️" },
  { id: 2024, tr: "Pil", en: "Battery", de: "Batterie", es: "Pila", emoji: "🔋" },
  { id: 2025, tr: "Çorap", en: "Socks", de: "Socken", es: "Calcetines", emoji: "🧦" },
  { id: 2026, tr: "Tişört", en: "T-shirt", de: "T-Shirt", es: "Camiseta", emoji: "👕" },
  { id: 2027, tr: "Taç", en: "Crown", de: "Krone", es: "Corona", emoji: "👑" },
  { id: 2028, tr: "Gitar", en: "Guitar", de: "Gitarre", es: "Guitarra", emoji: "🎸" },
  { id: 2029, tr: "Çekiç", en: "Hammer", de: "Hammer", es: "Martillo", emoji: "🔨" },
  { id: 2030, tr: "Kupa", en: "Trophy", de: "Pokal", es: "Trofeo", emoji: "🏆" },
  { id: 2031, tr: "Futbol topu", en: "Football", de: "Fußball", es: "Balón de fútbol", emoji: "⚽" },
  { id: 2032, tr: "Mikrofon", en: "Microphone", de: "Mikrofon", es: "Micrófono", emoji: "🎤" },
  { id: 2033, tr: "Piyano", en: "Piano", de: "Klavier", es: "Piano", emoji: "🎹" },
  { id: 2034, tr: "Keman", en: "Violin", de: "Geige", es: "Violín", emoji: "🎻" },
  { id: 2035, tr: "Davul", en: "Drum", de: "Trommel", es: "Tambor", emoji: "🥁" },
  { id: 2036, tr: "Trompet", en: "Trumpet", de: "Trompete", es: "Trompeta", emoji: "🎺" },
  { id: 2037, tr: "Zar", en: "Dice", de: "Würfel", es: "Dado", emoji: "🎲" },
  { id: 2038, tr: "Kum saati", en: "Hourglass", de: "Sanduhr", es: "Reloj de arena", emoji: "⌛" },
  { id: 2039, tr: "Termometre", en: "Thermometer", de: "Thermometer", es: "Termómetro", emoji: "🌡️" },
  { id: 2040, tr: "Pusula", en: "Compass", de: "Kompass", es: "Brújula", emoji: "🧭" },
  { id: 2041, tr: "Mıknatıs", en: "Magnet", de: "Magnet", es: "Imán", emoji: "🧲" },
  { id: 2042, tr: "Mikroskop", en: "Microscope", de: "Mikroskop", es: "Microscopio", emoji: "🔬" },
  { id: 2043, tr: "Teleskop", en: "Telescope", de: "Teleskop", es: "Telescopio", emoji: "🔭" },
  { id: 2044, tr: "Terlik", en: "Flip-flop", de: "Flip-Flop", es: "Chancla", emoji: "🩴" },
  { id: 2045, tr: "Biberon", en: "Baby bottle", de: "Babyflasche", es: "Biberón", emoji: "🍼" },
  { id: 2046, tr: "Boks eldiveni", en: "Boxing glove", de: "Boxhandschuh", es: "Guante de boxeo", emoji: "🥊" },
  { id: 2047, tr: "Kılıç", en: "Sword", de: "Schwert", es: "Espada", emoji: "🗡️" },
  { id: 2048, tr: "Kalkan", en: "Shield", de: "Schild", es: "Escudo", emoji: "🛡️" },
  { id: 2049, tr: "Sihirli değnek", en: "Magic wand", de: "Zauberstab", es: "Varita mágica", emoji: "🪄" },
  { id: 2050, tr: "Klavye", en: "Keyboard", de: "Tastatur", es: "Teclado", emoji: "⌨️" },
  { id: 2051, tr: "Bilgisayar faresi", en: "Computer mouse", de: "Computermaus", es: "Ratón de ordenador", emoji: "🖱️" },
  { id: 2052, tr: "Ruj", en: "Lipstick", de: "Lippenstift", es: "Pintalabios", emoji: "💄" },
  { id: 2053, tr: "Topuklu ayakkabı", en: "High heel", de: "High Heel", es: "Tacón alto", emoji: "👠" },
  { id: 2054, tr: "Oyuncak ayı", en: "Teddy bear", de: "Teddybär", es: "Osito de peluche", emoji: "🧸" },
  { id: 2055, tr: "Hediye paketi", en: "Gift box", de: "Geschenk", es: "Regalo", emoji: "🎁" },
  { id: 2056, tr: "Hazine haritası", en: "Treasure map", de: "Schatzkarte", es: "Mapa del tesoro", emoji: "🗺️" },
  { id: 2057, tr: "Kristal küre", en: "Crystal ball", de: "Kristallkugel", es: "Bola de cristal", emoji: "🔮" },
  { id: 2058, tr: "Ok ve yay", en: "Bow and arrow", de: "Pfeil und Bogen", es: "Arco y flecha", emoji: "🏹" },
  { id: 2059, tr: "Matruşka", en: "Nesting doll", de: "Matroschka", es: "Matrioska", emoji: "🪆" },
  { id: 2060, tr: "Araba", en: "Car", de: "Auto", es: "Coche", emoji: "🚗" },
  { id: 2061, tr: "Bisiklet", en: "Bicycle", de: "Fahrrad", es: "Bicicleta", emoji: "🚲" },
  { id: 2062, tr: "Uçak", en: "Airplane", de: "Flugzeug", es: "Avión", emoji: "✈️" },
  { id: 2063, tr: "Tren", en: "Train", de: "Zug", es: "Tren", emoji: "🚂" },
  { id: 2064, tr: "Gemi", en: "Ship", de: "Schiff", es: "Barco", emoji: "🚢" },
  { id: 2065, tr: "Roket", en: "Rocket", de: "Rakete", es: "Cohete", emoji: "🚀" },
  { id: 2066, tr: "Helikopter", en: "Helicopter", de: "Hubschrauber", es: "Helicóptero", emoji: "🚁" },
  { id: 2067, tr: "Otobüs", en: "Bus", de: "Bus", es: "Autobús", emoji: "🚌" },
  { id: 2068, tr: "Traktör", en: "Tractor", de: "Traktor", es: "Tractor", emoji: "🚜" },
  { id: 2069, tr: "İtfaiye arabası", en: "Fire engine", de: "Feuerwehrauto", es: "Camión de bomberos", emoji: "🚒" },
  { id: 2070, tr: "Polis arabası", en: "Police car", de: "Polizeiauto", es: "Coche de policía", emoji: "🚓" },
  { id: 2071, tr: "Paraşüt", en: "Parachute", de: "Fallschirm", es: "Paracaídas", emoji: "🪂" },
];

const PLACE_WORDS: WordEntry[] = [
  { id: 3001, tr: "Güneş", en: "Sun", de: "Sonne", es: "Sol", emoji: "☀️" },
  { id: 3002, tr: "Ağaç", en: "Tree", de: "Baum", es: "Árbol", emoji: "🌳" },
  { id: 3003, tr: "Çiçek", en: "Flower", de: "Blume", es: "Flor", emoji: "🌸" },
  { id: 3004, tr: "Dağ", en: "Mountain", de: "Berg", es: "Montaña", emoji: "⛰️" },
  { id: 3005, tr: "Bulut", en: "Cloud", de: "Wolke", es: "Nube", emoji: "☁️" },
  { id: 3006, tr: "Yıldız", en: "Star", de: "Stern", es: "Estrella", emoji: "⭐" },
  { id: 3007, tr: "Ay", en: "Moon", de: "Mond", es: "Luna", emoji: "🌙" },
  { id: 3008, tr: "Ateş", en: "Fire", de: "Feuer", es: "Fuego", emoji: "🔥" },
  { id: 3009, tr: "Gökkuşağı", en: "Rainbow", de: "Regenbogen", es: "Arcoíris", emoji: "🌈" },
  { id: 3010, tr: "Kaktüs", en: "Cactus", de: "Kaktus", es: "Cactus", emoji: "🌵" },
  { id: 3011, tr: "Palmiye", en: "Palm tree", de: "Palme", es: "Palmera", emoji: "🌴" },
  { id: 3012, tr: "Ayçiçeği", en: "Sunflower", de: "Sonnenblume", es: "Girasol", emoji: "🌻" },
  { id: 3013, tr: "Plaj", en: "Beach", de: "Strand", es: "Playa", emoji: "🏖️" },
  { id: 3014, tr: "Papatya", en: "Daisy", de: "Gänseblümchen", es: "Margarita", emoji: "🌼" },
  { id: 3015, tr: "Dolunay", en: "Full moon", de: "Vollmond", es: "Luna llena", emoji: "🌕" },
  { id: 3016, tr: "Yıldız kayması", en: "Shooting star", de: "Sternschnuppe", es: "Estrella fugaz", emoji: "🌠" },
  { id: 3017, tr: "Gün batımı", en: "Sunset", de: "Sonnenuntergang", es: "Atardecer", emoji: "🌅" },
  { id: 3018, tr: "Yanardağ", en: "Volcano", de: "Vulkan", es: "Volcán", emoji: "🌋" },
  { id: 3019, tr: "Ada", en: "Desert island", de: "Insel", es: "Isla", emoji: "🏝️" },
  { id: 3020, tr: "Çöl", en: "Desert", de: "Wüste", es: "Desierto", emoji: "🏜️" },
  { id: 3021, tr: "Kale", en: "Castle", de: "Burg", es: "Castillo", emoji: "🏯" },
  { id: 3022, tr: "Köprü", en: "Bridge", de: "Brücke", es: "Puente", emoji: "🌉" },
  { id: 3023, tr: "Eyfel Kulesi", en: "Eiffel Tower", de: "Eiffelturm", es: "Torre Eiffel", emoji: "🗼" },
  { id: 3024, tr: "Özgürlük Heykeli", en: "Statue of Liberty", de: "Freiheitsstatue", es: "Estatua de la Libertad", emoji: "🗽" },
  { id: 3025, tr: "Dönme dolap", en: "Ferris wheel", de: "Riesenrad", es: "Noria", emoji: "🎡" },
  { id: 3026, tr: "Sirk çadırı", en: "Circus tent", de: "Zirkuszelt", es: "Carpa de circo", emoji: "🎪" },
  { id: 3027, tr: "Çadır", en: "Tent", de: "Zelt", es: "Tienda de campaña", emoji: "⛺" },
  { id: 3028, tr: "Ev", en: "House", de: "Haus", es: "Casa", emoji: "🏠" },
  { id: 3029, tr: "Trafik lambası", en: "Traffic light", de: "Ampel", es: "Semáforo", emoji: "🚦" },
  { id: 3030, tr: "Kar tanesi", en: "Snowflake", de: "Schneeflocke", es: "Copo de nieve", emoji: "❄️" },
  { id: 3031, tr: "Hortum", en: "Tornado", de: "Tornado", es: "Tornado", emoji: "🌪️" },
  { id: 3032, tr: "Dev dalga", en: "Giant wave", de: "Riesenwelle", es: "Ola gigante", emoji: "🌊" },
  { id: 3033, tr: "Göktaşı", en: "Meteor", de: "Meteor", es: "Meteorito", emoji: "☄️" },
  { id: 3034, tr: "Satürn", en: "Saturn", de: "Saturn", es: "Saturno", emoji: "🪐" },
  { id: 3035, tr: "Kumdan kale", en: "Sandcastle", de: "Sandburg", es: "Castillo de arena", emoji: "🏰" },
  { id: 3036, tr: "Hız treni", en: "Roller coaster", de: "Achterbahn", es: "Montaña rusa", emoji: "🎢" },
  { id: 3037, tr: "UFO", en: "UFO", de: "UFO", es: "OVNI", emoji: "🛸" },
];

const PEOPLE_WORDS: WordEntry[] = [
  { id: 4001, tr: "Zombi", en: "Zombie", de: "Zombie", es: "Zombi", emoji: "🧟" },
  { id: 4002, tr: "Uzaylı", en: "Alien", de: "Außerirdischer", es: "Extraterrestre", emoji: "👽" },
  { id: 4003, tr: "Palyaço", en: "Clown", de: "Clown", es: "Payaso", emoji: "🤡" },
  { id: 4004, tr: "Korsan", en: "Pirate", de: "Pirat", es: "Pirata", emoji: "🏴‍☠️" },
  { id: 4005, tr: "Ninja", en: "Ninja", de: "Ninja", es: "Ninja", emoji: "🥷" },
  { id: 4006, tr: "Süper kahraman", en: "Superhero", de: "Superheld", es: "Superhéroe", emoji: "🦸" },
  { id: 4007, tr: "Unicorn", en: "Unicorn", de: "Einhorn", es: "Unicornio", emoji: "🦄" },
  { id: 4008, tr: "Vampir", en: "Vampire", de: "Vampir", es: "Vampiro", emoji: "🧛" },
  { id: 4009, tr: "Hayalet", en: "Ghost", de: "Geist", es: "Fantasma", emoji: "👻" },
  { id: 4010, tr: "Büyücü", en: "Wizard", de: "Zauberer", es: "Mago", emoji: "🧙" },
  { id: 4011, tr: "Robot", en: "Robot", de: "Roboter", es: "Robot", emoji: "🤖" },
  { id: 4012, tr: "Deniz kızı", en: "Mermaid", de: "Meerjungfrau", es: "Sirena", emoji: "🧜‍♀️" },
  { id: 4013, tr: "Peri", en: "Fairy", de: "Fee", es: "Hada", emoji: "🧚" },
  { id: 4014, tr: "Ejderha", en: "Dragon", de: "Drache", es: "Dragón", emoji: "🐉" },
  { id: 4015, tr: "İskelet", en: "Skeleton", de: "Skelett", es: "Esqueleto", emoji: "💀" },
  { id: 4016, tr: "Canavar", en: "Monster", de: "Monster", es: "Monstruo", emoji: "👹" },
  { id: 4017, tr: "Kovboy", en: "Cowboy", de: "Cowboy", es: "Vaquero", emoji: "🤠" },
  { id: 4018, tr: "Astronot", en: "Astronaut", de: "Astronaut", es: "Astronauta", emoji: "🧑‍🚀" },
  { id: 4019, tr: "Kardan adam", en: "Snowman", de: "Schneemann", es: "Muñeco de nieve", emoji: "⛄" },
  { id: 4020, tr: "Melek", en: "Angel", de: "Engel", es: "Ángel", emoji: "👼" },
  { id: 4021, tr: "Şeytan", en: "Devil", de: "Teufel", es: "Diablo", emoji: "😈" },
  { id: 4022, tr: "Bebek", en: "Baby", de: "Baby", es: "Bebé", emoji: "👶" },
  { id: 4023, tr: "İtfaiyeci", en: "Firefighter", de: "Feuerwehrmann", es: "Bombero", emoji: "🧑‍🚒" },
  { id: 4024, tr: "Karateci", en: "Karate fighter", de: "Karatekämpfer", es: "Karateca", emoji: "🥋" },
  { id: 4025, tr: "Sörfçü", en: "Surfer", de: "Surfer", es: "Surfista", emoji: "🏄" },
  { id: 4026, tr: "Kayakçı", en: "Skier", de: "Skifahrer", es: "Esquiador", emoji: "⛷️" },
  { id: 4027, tr: "Lambadan çıkan cin", en: "Genie", de: "Dschinn", es: "Genio de la lámpara", emoji: "🧞" },
];

const LOVE_WORDS: WordEntry[] = [
  { id: 5001, tr: "Kalp", en: "Heart", de: "Herz", es: "Corazón", emoji: "❤️" },
  { id: 5002, tr: "Öpücük", en: "Kiss", de: "Kuss", es: "Beso", emoji: "💋" },
  { id: 5003, tr: "Nişan yüzüğü", en: "Engagement ring", de: "Verlobungsring", es: "Anillo de compromiso", emoji: "💍" },
  { id: 5004, tr: "Kırmızı gül", en: "Red rose", de: "Rote Rose", es: "Rosa roja", emoji: "🌹" },
  { id: 5005, tr: "Çiçek buketi", en: "Bouquet", de: "Blumenstrauß", es: "Ramo de flores", emoji: "💐" },
  { id: 5006, tr: "Aşk mektubu", en: "Love letter", de: "Liebesbrief", es: "Carta de amor", emoji: "💌" },
  { id: 5007, tr: "Gelin", en: "Bride", de: "Braut", es: "Novia", emoji: "👰" },
  { id: 5008, tr: "Damat", en: "Groom", de: "Bräutigam", es: "Novio", emoji: "🤵" },
  { id: 5009, tr: "Şarap kadehi", en: "Wine glass", de: "Weinglas", es: "Copa de vino", emoji: "🍷" },
  { id: 5010, tr: "Aşk oku", en: "Cupid's arrow", de: "Amors Pfeil", es: "Flecha de Cupido", emoji: "💘" },
  { id: 5011, tr: "Dans eden çift", en: "Dancing couple", de: "Tanzendes Paar", es: "Pareja bailando", emoji: "💃" },
  { id: 5012, tr: "El ele çift", en: "Couple holding hands", de: "Händchen haltendes Paar", es: "Pareja de la mano", emoji: "👫" },
  { id: 5013, tr: "Piknik sepeti", en: "Picnic basket", de: "Picknickkorb", es: "Cesta de picnic", emoji: "🧺" },
  { id: 5014, tr: "Havai fişek", en: "Fireworks", de: "Feuerwerk", es: "Fuegos artificiales", emoji: "🎆" },
  { id: 5015, tr: "Selfie", en: "Selfie", de: "Selfie", es: "Selfie", emoji: "🤳" },
  { id: 5016, tr: "Aşk kilidi", en: "Love lock", de: "Liebesschloss", es: "Candado del amor", emoji: "🔒" },
  { id: 5017, tr: "Sevgililer kartı", en: "Valentine card", de: "Valentinskarte", es: "Tarjeta de San Valentín", emoji: "💝" },
  { id: 5018, tr: "Kırık kalp", en: "Broken heart", de: "Gebrochenes Herz", es: "Corazón roto", emoji: "💔" },
  { id: 5019, tr: "Gondol", en: "Gondola", de: "Gondel", es: "Góndola", emoji: "🛶" },
  { id: 5020, tr: "Balayı uçağı", en: "Honeymoon flight", de: "Flitterwochenflug", es: "Vuelo de luna de miel", emoji: "✈️" },
  { id: 5021, tr: "Kalpli balon", en: "Heart balloon", de: "Herzballon", es: "Globo de corazón", emoji: "🎈" },
  { id: 5022, tr: "Dudaklar", en: "Lips", de: "Lippen", es: "Labios", emoji: "👄" },
  { id: 5023, tr: "Elmas", en: "Diamond", de: "Diamant", es: "Diamante", emoji: "💎" },
  { id: 5024, tr: "Kilitli kalp", en: "Locked heart", de: "Verschlossenes Herz", es: "Corazón con candado", emoji: "🔐" },
  { id: 5025, tr: "Mum ışığında yemek", en: "Candlelight dinner", de: "Essen bei Kerzenlicht", es: "Cena con velas", emoji: "🕯️" },
  { id: 5026, tr: "Tandem bisiklet", en: "Tandem bike", de: "Tandem", es: "Bicicleta tándem", emoji: "🚲" },
];

const THEMES: Record<Exclude<WordCategory, "mixed">, WordEntry[]> = {
  animals: ANIMAL_WORDS,
  food: FOOD_WORDS,
  objects: OBJECT_WORDS,
  places: PLACE_WORDS,
  people: PEOPLE_WORDS,
  love: LOVE_WORDS,
};

const EVERY_WORD: WordEntry[] = Object.values(THEMES).flat();

function wordsOf(category: WordCategory | string): WordEntry[] {
  const id = normalizeCategory(category);
  return id === "mixed" ? EVERY_WORD : THEMES[id];
}

/** The theme a word belongs to (any language). */
function themeOf(word: string): WordEntry[] | null {
  const needle = word.trim().toLocaleLowerCase("tr");
  for (const list of Object.values(THEMES)) {
    if (list.some((entry) => [entry.tr, entry.en, entry.de, entry.es].some((value) => value.toLocaleLowerCase("tr") === needle))) return list;
  }
  return null;
}

// Track used words to avoid repetition within a session / server process.
const usedWordIds = new Set<number>();

export interface PickedWord {
  id: number;
  word: string;
  emoji: string;
  category: WordCategory;
}

function localized(entry: WordEntry, locale: Locale): string {
  return entry[locale] || entry.en;
}

export function pickWord(category: WordCategory | string, locale: Locale): PickedWord {
  const id = normalizeCategory(category);
  const words = wordsOf(id);
  let available = words.filter((w) => !usedWordIds.has(w.id));
  if (available.length === 0) {
    words.forEach((w) => usedWordIds.delete(w.id));
    available = words;
  }
  const entry = available[Math.floor(Math.random() * available.length)];
  usedWordIds.add(entry.id);
  return { id: entry.id, word: localized(entry, locale), emoji: entry.emoji, category: id };
}

export function getRandomWord(category: WordCategory | string, locale: Locale): string {
  return pickWord(category, locale).word;
}

export function getRandomWordFromFreeCategories(locale: Locale): string {
  return getRandomWord("mixed", locale);
}

export function getDailyWord(locale: Locale): { word: string; category: WordCategory; emoji: string } {
  // Date as seed → everyone gets the same word today.
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const word = EVERY_WORD[seed % EVERY_WORD.length];
  return { word: localized(word, locale), category: "mixed", emoji: word.emoji };
}

/** Finds the reference emoji for a word in any language ("" if unknown). */
export function findWordEmoji(word: string): string {
  const needle = word.trim().toLocaleLowerCase("tr");
  if (!needle) return "";
  const hit = EVERY_WORD.find((entry) =>
    [entry.tr, entry.en, entry.de, entry.es].some((value) => value.toLocaleLowerCase("tr") === needle),
  );
  return hit?.emoji || "";
}

export function getAllWords(): WordEntry[] {
  return EVERY_WORD;
}

export function getTotalWordCount(): number {
  return EVERY_WORD.length;
}

export function getCategoryWordCount(category: WordCategory | string): number {
  return wordsOf(category).length;
}

export function resetUsedWords(): void {
  usedWordIds.clear();
}

/** Wrong-but-plausible answers from the word's own theme, for the drawer's guess buttons. */
export function getDistractors(word: string, category: WordCategory | string, locale: Locale, count = 3): string[] {
  const pool = (themeOf(word) || wordsOf(category)).map((entry) => localized(entry, locale));
  const others = pool.filter((value) => value.toLocaleLowerCase("tr") !== word.toLocaleLowerCase("tr"));
  for (let i = others.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  return others.slice(0, count);
}
