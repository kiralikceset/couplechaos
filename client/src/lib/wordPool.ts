/**
 * Word pool: one simple thing per word ("Cat", "Pizza", "Ring", "Suitcase"), grouped by
 * themes from life as a couple. Anyone can draw any of them with a finger in a few seconds;
 * the fun comes from the doodles and the AI judge, not from hard words. "Mixed" mixes them all.
 *
 * Every entry has an emoji that is shown on the result screen next to the players' drawing.
 */

import type { Locale } from "./i18n";

export type WordCategory = "mixed" | "home" | "date" | "travel" | "food" | "pets" | "everyday" | "love" | "special";

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
  { id: "home", emoji: "🏠", premium: false, nameKey: "cat.home" },
  { id: "date", emoji: "🕯️", premium: false, nameKey: "cat.date" },
  { id: "travel", emoji: "✈️", premium: false, nameKey: "cat.travel" },
  { id: "food", emoji: "🍝", premium: false, nameKey: "cat.food" },
  { id: "pets", emoji: "🐾", premium: false, nameKey: "cat.pets" },
  { id: "everyday", emoji: "☕", premium: false, nameKey: "cat.everyday" },
  { id: "love", emoji: "💕", premium: false, nameKey: "cat.love" },
  { id: "special", emoji: "🎉", premium: false, nameKey: "cat.special" },
];

/** Themes from older versions (saved on phones, sent by old apps) → today's themes. */
const LEGACY: Record<string, WordCategory> = {
  daily: "mixed", funny: "mixed", hard: "mixed", daily_challenge: "mixed", people: "mixed",
  spicy: "love", romantic: "love",
  animals: "pets", objects: "home", vehicles: "travel", places: "travel", fun: "everyday",
};

/** Any stored/old category id → a valid one ("animals" from an old phone → "pets"). */
export function normalizeCategory(value: unknown): WordCategory {
  const id = String(value || "");
  if (CATEGORIES.some((category) => category.id === id)) return id as WordCategory;
  return LEGACY[id] || "mixed";
}

const HOME_SCENES: WordEntry[] = [
  { id: 10001, tr: "Yatak", en: "Bed", de: "Bett", es: "Cama", emoji: "🛏️" },
  { id: 10002, tr: "Horlama", en: "Snoring", de: "Schnarchen", es: "Ronquidos", emoji: "😴" },
  { id: 10003, tr: "Televizyon", en: "TV", de: "Fernseher", es: "Televisión", emoji: "📺" },
  { id: 10004, tr: "Kanepe", en: "Sofa", de: "Sofa", es: "Sofá", emoji: "🛋️" },
  { id: 10005, tr: "Ampul", en: "Light bulb", de: "Glühbirne", es: "Bombilla", emoji: "💡" },
  { id: 10006, tr: "Kapı", en: "Door", de: "Tür", es: "Puerta", emoji: "🚪" },
  { id: 10007, tr: "Pencere", en: "Window", de: "Fenster", es: "Ventana", emoji: "🪟" },
  { id: 10008, tr: "Ayna", en: "Mirror", de: "Spiegel", es: "Espejo", emoji: "🪞" },
  { id: 10009, tr: "Süpürge", en: "Broom", de: "Besen", es: "Escoba", emoji: "🧹" },
  { id: 10010, tr: "Klozet", en: "Toilet", de: "Toilette", es: "Váter", emoji: "🚽" },
  { id: 10011, tr: "Tuvalet kağıdı", en: "Toilet paper", de: "Klopapier", es: "Papel higiénico", emoji: "🧻" },
  { id: 10012, tr: "Diş fırçası", en: "Toothbrush", de: "Zahnbürste", es: "Cepillo de dientes", emoji: "🪥" },
  { id: 10013, tr: "Duş", en: "Shower", de: "Dusche", es: "Ducha", emoji: "🚿" },
  { id: 10014, tr: "Küvet", en: "Bathtub", de: "Badewanne", es: "Bañera", emoji: "🛁" },
  { id: 10015, tr: "Çorap", en: "Sock", de: "Socke", es: "Calcetín", emoji: "🧦" },
  { id: 10016, tr: "Çalar saat", en: "Alarm clock", de: "Wecker", es: "Despertador", emoji: "⏰" },
  { id: 10017, tr: "Saksı çiçeği", en: "Potted plant", de: "Topfpflanze", es: "Maceta", emoji: "🪴" },
  { id: 10018, tr: "Sandalye", en: "Chair", de: "Stuhl", es: "Silla", emoji: "🪑" },
  { id: 10019, tr: "Merdiven", en: "Ladder", de: "Leiter", es: "Escalera", emoji: "🪜" },
  { id: 10020, tr: "Çekiç", en: "Hammer", de: "Hammer", es: "Martillo", emoji: "🔨" },
  { id: 10021, tr: "Kova", en: "Bucket", de: "Eimer", es: "Cubo", emoji: "🪣" },
  { id: 10022, tr: "Sabun", en: "Soap", de: "Seife", es: "Jabón", emoji: "🧼" },
];

const DATE_SCENES: WordEntry[] = [
  { id: 11001, tr: "Patlamış mısır", en: "Popcorn", de: "Popcorn", es: "Palomitas", emoji: "🍿" },
  { id: 11002, tr: "Mum", en: "Candle", de: "Kerze", es: "Vela", emoji: "🕯️" },
  { id: 11003, tr: "Gitar", en: "Guitar", de: "Gitarre", es: "Guitarra", emoji: "🎸" },
  { id: 11004, tr: "Kahve", en: "Coffee", de: "Kaffee", es: "Café", emoji: "☕" },
  { id: 11005, tr: "Milkshake", en: "Milkshake", de: "Milchshake", es: "Batido", emoji: "🥤" },
  { id: 11006, tr: "Bowling", en: "Bowling", de: "Bowling", es: "Bolos", emoji: "🎳" },
  { id: 11007, tr: "Mikrofon", en: "Microphone", de: "Mikrofon", es: "Micrófono", emoji: "🎤" },
  { id: 11008, tr: "Oyuncak ayı", en: "Teddy bear", de: "Teddybär", es: "Osito de peluche", emoji: "🧸" },
  { id: 11009, tr: "Dönme dolap", en: "Ferris wheel", de: "Riesenrad", es: "Noria", emoji: "🎡" },
  { id: 11010, tr: "Hız treni", en: "Roller coaster", de: "Achterbahn", es: "Montaña rusa", emoji: "🎢" },
  { id: 11011, tr: "Şemsiye", en: "Umbrella", de: "Regenschirm", es: "Paraguas", emoji: "🌂" },
  { id: 11012, tr: "Fotoğraf makinesi", en: "Camera", de: "Kamera", es: "Cámara", emoji: "📷" },
  { id: 11013, tr: "Piknik sepeti", en: "Picnic basket", de: "Picknickkorb", es: "Cesta de pícnic", emoji: "🧺" },
  { id: 11014, tr: "Gün batımı", en: "Sunset", de: "Sonnenuntergang", es: "Atardecer", emoji: "🌅" },
  { id: 11015, tr: "Telefon", en: "Phone", de: "Handy", es: "Móvil", emoji: "📱" },
  { id: 11016, tr: "Ruj", en: "Lipstick", de: "Lippenstift", es: "Pintalabios", emoji: "💄" },
  { id: 11017, tr: "Elbise", en: "Dress", de: "Kleid", es: "Vestido", emoji: "👗" },
  { id: 11018, tr: "Kravat", en: "Tie", de: "Krawatte", es: "Corbata", emoji: "👔" },
  { id: 11019, tr: "Parfüm", en: "Perfume", de: "Parfüm", es: "Perfume", emoji: "🧴" },
  { id: 11020, tr: "Dans", en: "Dancing", de: "Tanzen", es: "Baile", emoji: "💃" },
  { id: 11021, tr: "Ay", en: "Moon", de: "Mond", es: "Luna", emoji: "🌙" },
];

const TRAVEL_SCENES: WordEntry[] = [
  { id: 12001, tr: "Valiz", en: "Suitcase", de: "Koffer", es: "Maleta", emoji: "🧳" },
  { id: 12002, tr: "Uçak", en: "Airplane", de: "Flugzeug", es: "Avión", emoji: "✈️" },
  { id: 12003, tr: "Pasaport", en: "Passport", de: "Reisepass", es: "Pasaporte", emoji: "🛂" },
  { id: 12004, tr: "Harita", en: "Map", de: "Landkarte", es: "Mapa", emoji: "🗺️" },
  { id: 12005, tr: "Çadır", en: "Tent", de: "Zelt", es: "Tienda de campaña", emoji: "⛺" },
  { id: 12006, tr: "Kumdan kale", en: "Sandcastle", de: "Sandburg", es: "Castillo de arena", emoji: "🏰" },
  { id: 12007, tr: "Plaj şemsiyesi", en: "Beach umbrella", de: "Sonnenschirm", es: "Sombrilla", emoji: "🏖️" },
  { id: 12008, tr: "Güneş gözlüğü", en: "Sunglasses", de: "Sonnenbrille", es: "Gafas de sol", emoji: "🕶️" },
  { id: 12009, tr: "Gemi", en: "Ship", de: "Schiff", es: "Barco", emoji: "🚢" },
  { id: 12010, tr: "Tren", en: "Train", de: "Zug", es: "Tren", emoji: "🚆" },
  { id: 12011, tr: "Palmiye", en: "Palm tree", de: "Palme", es: "Palmera", emoji: "🌴" },
  { id: 12012, tr: "Deniz kabuğu", en: "Seashell", de: "Muschel", es: "Concha", emoji: "🐚" },
  { id: 12013, tr: "Dağ", en: "Mountain", de: "Berg", es: "Montaña", emoji: "⛰️" },
  { id: 12014, tr: "Pusula", en: "Compass", de: "Kompass", es: "Brújula", emoji: "🧭" },
  { id: 12015, tr: "Sırt çantası", en: "Backpack", de: "Rucksack", es: "Mochila", emoji: "🎒" },
  { id: 12016, tr: "Kayak", en: "Skis", de: "Skier", es: "Esquís", emoji: "⛷️" },
  { id: 12017, tr: "Sörf tahtası", en: "Surfboard", de: "Surfbrett", es: "Tabla de surf", emoji: "🏄" },
  { id: 12018, tr: "Can simidi", en: "Life ring", de: "Rettungsring", es: "Salvavidas", emoji: "🛟" },
  { id: 12019, tr: "Deve", en: "Camel", de: "Kamel", es: "Camello", emoji: "🐪" },
  { id: 12020, tr: "Eyfel Kulesi", en: "Eiffel Tower", de: "Eiffelturm", es: "Torre Eiffel", emoji: "🗼" },
  { id: 12021, tr: "Güneş", en: "Sun", de: "Sonne", es: "Sol", emoji: "☀️" },
];

const FOOD_SCENES: WordEntry[] = [
  { id: 13001, tr: "Pizza", en: "Pizza", de: "Pizza", es: "Pizza", emoji: "🍕" },
  { id: 13002, tr: "Hamburger", en: "Burger", de: "Burger", es: "Hamburguesa", emoji: "🍔" },
  { id: 13003, tr: "Dondurma", en: "Ice cream", de: "Eistüte", es: "Helado", emoji: "🍦" },
  { id: 13004, tr: "Spagetti", en: "Spaghetti", de: "Spaghetti", es: "Espaguetis", emoji: "🍝" },
  { id: 13005, tr: "Muz", en: "Banana", de: "Banane", es: "Plátano", emoji: "🍌" },
  { id: 13006, tr: "Yumurta", en: "Egg", de: "Ei", es: "Huevo", emoji: "🥚" },
  { id: 13007, tr: "Tava", en: "Frying pan", de: "Pfanne", es: "Sartén", emoji: "🍳" },
  { id: 13008, tr: "Ekmek", en: "Bread", de: "Brot", es: "Pan", emoji: "🍞" },
  { id: 13009, tr: "Peynir", en: "Cheese", de: "Käse", es: "Queso", emoji: "🧀" },
  { id: 13010, tr: "Havuç", en: "Carrot", de: "Karotte", es: "Zanahoria", emoji: "🥕" },
  { id: 13011, tr: "Çilek", en: "Strawberry", de: "Erdbeere", es: "Fresa", emoji: "🍓" },
  { id: 13012, tr: "Karpuz", en: "Watermelon", de: "Wassermelone", es: "Sandía", emoji: "🍉" },
  { id: 13013, tr: "Acı biber", en: "Chili pepper", de: "Chilischote", es: "Chile", emoji: "🌶️" },
  { id: 13014, tr: "Kurabiye", en: "Cookie", de: "Keks", es: "Galleta", emoji: "🍪" },
  { id: 13015, tr: "Pankek", en: "Pancakes", de: "Pfannkuchen", es: "Tortitas", emoji: "🥞" },
  { id: 13016, tr: "Simit", en: "Bagel", de: "Bagel", es: "Rosca", emoji: "🥯" },
  { id: 13017, tr: "Tencere", en: "Pot", de: "Kochtopf", es: "Olla", emoji: "🍲" },
  { id: 13018, tr: "Ananas", en: "Pineapple", de: "Ananas", es: "Piña", emoji: "🍍" },
  { id: 13019, tr: "Kiraz", en: "Cherries", de: "Kirschen", es: "Cerezas", emoji: "🍒" },
  { id: 13020, tr: "Sosisli", en: "Hot dog", de: "Hotdog", es: "Perrito caliente", emoji: "🌭" },
  { id: 13021, tr: "Donut", en: "Donut", de: "Donut", es: "Dónut", emoji: "🍩" },
  { id: 13022, tr: "Bal", en: "Honey", de: "Honig", es: "Miel", emoji: "🍯" },
];

const PETS_SCENES: WordEntry[] = [
  { id: 14001, tr: "Kedi", en: "Cat", de: "Katze", es: "Gato", emoji: "🐈" },
  { id: 14002, tr: "Köpek", en: "Dog", de: "Hund", es: "Perro", emoji: "🐕" },
  { id: 14003, tr: "Balık", en: "Fish", de: "Fisch", es: "Pez", emoji: "🐟" },
  { id: 14004, tr: "Kuş", en: "Bird", de: "Vogel", es: "Pájaro", emoji: "🐦" },
  { id: 14005, tr: "Papağan", en: "Parrot", de: "Papagei", es: "Loro", emoji: "🦜" },
  { id: 14006, tr: "Hamster", en: "Hamster", de: "Hamster", es: "Hámster", emoji: "🐹" },
  { id: 14007, tr: "Tavşan", en: "Rabbit", de: "Hase", es: "Conejo", emoji: "🐇" },
  { id: 14008, tr: "Kaplumbağa", en: "Turtle", de: "Schildkröte", es: "Tortuga", emoji: "🐢" },
  { id: 14009, tr: "Fare", en: "Mouse", de: "Maus", es: "Ratón", emoji: "🐁" },
  { id: 14010, tr: "Kemik", en: "Bone", de: "Knochen", es: "Hueso", emoji: "🦴" },
  { id: 14011, tr: "Mama kabı", en: "Pet bowl", de: "Futternapf", es: "Comedero", emoji: "🥣" },
  { id: 14012, tr: "Akvaryum", en: "Fish tank", de: "Aquarium", es: "Pecera", emoji: "🐠" },
  { id: 14013, tr: "Yün yumağı", en: "Ball of yarn", de: "Wollknäuel", es: "Ovillo de lana", emoji: "🧶" },
  { id: 14014, tr: "Tenis topu", en: "Tennis ball", de: "Tennisball", es: "Pelota de tenis", emoji: "🎾" },
  { id: 14015, tr: "Pati izi", en: "Paw print", de: "Pfotenabdruck", es: "Huella de pata", emoji: "🐾" },
  { id: 14016, tr: "Ördek", en: "Duck", de: "Ente", es: "Pato", emoji: "🦆" },
  { id: 14017, tr: "Kurbağa", en: "Frog", de: "Frosch", es: "Rana", emoji: "🐸" },
  { id: 14018, tr: "Kirpi", en: "Hedgehog", de: "Igel", es: "Erizo", emoji: "🦔" },
  { id: 14019, tr: "Kelebek", en: "Butterfly", de: "Schmetterling", es: "Mariposa", emoji: "🦋" },
  { id: 14020, tr: "Salyangoz", en: "Snail", de: "Schnecke", es: "Caracol", emoji: "🐌" },
];

const EVERYDAY_SCENES: WordEntry[] = [
  { id: 15001, tr: "Araba", en: "Car", de: "Auto", es: "Coche", emoji: "🚗" },
  { id: 15002, tr: "Otobüs", en: "Bus", de: "Bus", es: "Autobús", emoji: "🚌" },
  { id: 15003, tr: "Bisiklet", en: "Bike", de: "Fahrrad", es: "Bicicleta", emoji: "🚲" },
  { id: 15004, tr: "Trafik lambası", en: "Traffic light", de: "Ampel", es: "Semáforo", emoji: "🚦" },
  { id: 15005, tr: "Yağmur", en: "Rain", de: "Regen", es: "Lluvia", emoji: "🌧️" },
  { id: 15006, tr: "Bulut", en: "Cloud", de: "Wolke", es: "Nube", emoji: "☁️" },
  { id: 15007, tr: "Gökkuşağı", en: "Rainbow", de: "Regenbogen", es: "Arcoíris", emoji: "🌈" },
  { id: 15008, tr: "Şimşek", en: "Lightning", de: "Blitz", es: "Rayo", emoji: "⚡" },
  { id: 15009, tr: "Kardan adam", en: "Snowman", de: "Schneemann", es: "Muñeco de nieve", emoji: "⛄" },
  { id: 15010, tr: "Ağaç", en: "Tree", de: "Baum", es: "Árbol", emoji: "🌳" },
  { id: 15011, tr: "Ev", en: "House", de: "Haus", es: "Casa", emoji: "🏠" },
  { id: 15012, tr: "Market arabası", en: "Shopping cart", de: "Einkaufswagen", es: "Carrito", emoji: "🛒" },
  { id: 15013, tr: "Anahtar", en: "Key", de: "Schlüssel", es: "Llave", emoji: "🔑" },
  { id: 15014, tr: "Gözlük", en: "Glasses", de: "Brille", es: "Gafas", emoji: "👓" },
  { id: 15015, tr: "Şapka", en: "Cap", de: "Kappe", es: "Gorra", emoji: "🧢" },
  { id: 15016, tr: "Spor ayakkabı", en: "Sneaker", de: "Turnschuh", es: "Zapatilla", emoji: "👟" },
  { id: 15017, tr: "Kitap", en: "Book", de: "Buch", es: "Libro", emoji: "📖" },
  { id: 15018, tr: "Kol saati", en: "Watch", de: "Armbanduhr", es: "Reloj", emoji: "⌚" },
  { id: 15019, tr: "Futbol topu", en: "Soccer ball", de: "Fußball", es: "Balón de fútbol", emoji: "⚽" },
  { id: 15020, tr: "Uçurtma", en: "Kite", de: "Drachen", es: "Cometa", emoji: "🪁" },
];

const LOVE_SCENES: WordEntry[] = [
  { id: 16001, tr: "Kalp", en: "Heart", de: "Herz", es: "Corazón", emoji: "❤️" },
  { id: 16002, tr: "Kırık kalp", en: "Broken heart", de: "Gebrochenes Herz", es: "Corazón roto", emoji: "💔" },
  { id: 16003, tr: "Yüzük", en: "Ring", de: "Ring", es: "Anillo", emoji: "💍" },
  { id: 16004, tr: "Öpücük", en: "Kiss", de: "Kuss", es: "Beso", emoji: "💋" },
  { id: 16005, tr: "Gül", en: "Rose", de: "Rose", es: "Rosa", emoji: "🌹" },
  { id: 16006, tr: "Aşk mektubu", en: "Love letter", de: "Liebesbrief", es: "Carta de amor", emoji: "💌" },
  { id: 16007, tr: "Çikolata", en: "Chocolate", de: "Schokolade", es: "Chocolate", emoji: "🍫" },
  { id: 16008, tr: "Oklu kalp", en: "Cupid's arrow", de: "Amors Pfeil", es: "Flecha de Cupido", emoji: "💘" },
  { id: 16009, tr: "Gelinlik", en: "Wedding dress", de: "Brautkleid", es: "Vestido de novia", emoji: "👰" },
  { id: 16010, tr: "Damat", en: "Groom", de: "Bräutigam", es: "Novio", emoji: "🤵" },
  { id: 16011, tr: "Düğün pastası", en: "Wedding cake", de: "Hochzeitstorte", es: "Pastel de boda", emoji: "💒" },
  { id: 16012, tr: "Çiçek buketi", en: "Bouquet", de: "Blumenstrauß", es: "Ramo de flores", emoji: "💐" },
  { id: 16013, tr: "Sarılmak", en: "Hug", de: "Umarmung", es: "Abrazo", emoji: "🫂" },
  { id: 16014, tr: "Kuğu", en: "Swan", de: "Schwan", es: "Cisne", emoji: "🦢" },
  { id: 16015, tr: "Yıldız", en: "Star", de: "Stern", es: "Estrella", emoji: "⭐" },
  { id: 16016, tr: "Melek", en: "Angel", de: "Engel", es: "Ángel", emoji: "👼" },
  { id: 16017, tr: "Kalpli balon", en: "Heart balloon", de: "Herzballon", es: "Globo de corazón", emoji: "🎈" },
  { id: 16018, tr: "Asma kilit", en: "Padlock", de: "Vorhängeschloss", es: "Candado", emoji: "🔒" },
  { id: 16019, tr: "Selfie", en: "Selfie", de: "Selfie", es: "Selfie", emoji: "🤳" },
  { id: 16020, tr: "Taç", en: "Crown", de: "Krone", es: "Corona", emoji: "👑" },
];

const SPECIAL_SCENES: WordEntry[] = [
  { id: 17001, tr: "Doğum günü pastası", en: "Birthday cake", de: "Geburtstagstorte", es: "Pastel de cumpleaños", emoji: "🎂" },
  { id: 17002, tr: "Balon", en: "Balloon", de: "Luftballon", es: "Globo", emoji: "🎈" },
  { id: 17003, tr: "Hediye", en: "Gift", de: "Geschenk", es: "Regalo", emoji: "🎁" },
  { id: 17004, tr: "Konfeti", en: "Confetti", de: "Konfetti", es: "Confeti", emoji: "🎊" },
  { id: 17005, tr: "Parti şapkası", en: "Party hat", de: "Partyhut", es: "Gorro de fiesta", emoji: "🥳" },
  { id: 17006, tr: "Havai fişek", en: "Fireworks", de: "Feuerwerk", es: "Fuegos artificiales", emoji: "🎆" },
  { id: 17007, tr: "Noel Baba", en: "Santa Claus", de: "Weihnachtsmann", es: "Papá Noel", emoji: "🎅" },
  { id: 17008, tr: "Yılbaşı ağacı", en: "Christmas tree", de: "Weihnachtsbaum", es: "Árbol de Navidad", emoji: "🎄" },
  { id: 17009, tr: "Balkabağı", en: "Pumpkin", de: "Kürbis", es: "Calabaza", emoji: "🎃" },
  { id: 17010, tr: "Hayalet", en: "Ghost", de: "Gespenst", es: "Fantasma", emoji: "👻" },
  { id: 17011, tr: "Paskalya yumurtası", en: "Easter egg", de: "Osterei", es: "Huevo de Pascua", emoji: "🐣" },
  { id: 17012, tr: "Kep", en: "Graduation cap", de: "Doktorhut", es: "Birrete", emoji: "🎓" },
  { id: 17013, tr: "Kupa", en: "Trophy", de: "Pokal", es: "Trofeo", emoji: "🏆" },
  { id: 17014, tr: "Madalya", en: "Medal", de: "Medaille", es: "Medalla", emoji: "🏅" },
  { id: 17015, tr: "Çan", en: "Bell", de: "Glocke", es: "Campana", emoji: "🔔" },
  { id: 17016, tr: "Kurdele", en: "Bow", de: "Schleife", es: "Lazo", emoji: "🎀" },
  { id: 17017, tr: "Sihirbaz şapkası", en: "Top hat", de: "Zylinder", es: "Sombrero de copa", emoji: "🎩" },
  { id: 17018, tr: "Bilet", en: "Ticket", de: "Ticket", es: "Entrada", emoji: "🎟️" },
  { id: 17019, tr: "Kamp ateşi", en: "Campfire", de: "Lagerfeuer", es: "Fogata", emoji: "🔥" },
];

const THEMES: Record<Exclude<WordCategory, "mixed">, WordEntry[]> = {
  home: HOME_SCENES,
  date: DATE_SCENES,
  travel: TRAVEL_SCENES,
  food: FOOD_SCENES,
  pets: PETS_SCENES,
  everyday: EVERYDAY_SCENES,
  love: LOVE_SCENES,
  special: SPECIAL_SCENES,
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

/**
 * The daily word changes at 08:00 UTC: midnight on the US west coast, 3 am on the east
 * coast and the morning in Europe, so it never flips during a US or EU evening.
 * Same moment everywhere, so phone, server and leaderboard always agree.
 */
export const DAILY_RESET_UTC_HOUR = 8;
const RESET_MS = DAILY_RESET_UTC_HOUR * 3_600_000;

/** The game day ("YYYY-MM-DD") a moment belongs to. */
export function dailyKey(now = new Date()): string {
  return new Date(now.getTime() - RESET_MS).toISOString().slice(0, 10);
}

export function getDailyWord(locale: Locale, now = new Date()): { word: string; category: WordCategory; emoji: string } {
  const seed = Number(dailyKey(now).replaceAll("-", ""));
  const word = EVERY_WORD[seed % EVERY_WORD.length];
  return { word: localized(word, locale), category: "mixed", emoji: word.emoji };
}

/** Milliseconds until the daily word changes. */
export function msUntilNextDailyWord(now = new Date()): number {
  const shifted = new Date(now.getTime() - RESET_MS);
  const next = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() + 1) + RESET_MS;
  return Math.max(0, next - now.getTime());
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

/** A few well-known words of a theme, to show what it holds ("Dog, Cat, Bird"). */
export function getCategorySamples(category: WordCategory | string, locale: Locale, count = 3): string[] {
  return wordsOf(category).slice(0, count).map((entry) => localized(entry, locale));
}

export function resetUsedWords(): void {
  usedWordIds.clear();
}

/**
 * Words that look alike when drawn. They never appear together as guess options, so a good
 * drawing of "Kiss" is not lost to "Lips", or "Moon" to "Full moon".
 */
const LOOK_ALIKE: number[][] = [
  // at home
  [10001, 10002], // bed, snoring
  [10006, 10007], // door, window
  [10003, 10008], // tv, mirror
  [10004, 10018], // sofa, chair
  [10010, 10011], // toilet, toilet paper
  [10013, 10014], // shower, bathtub
  // date night
  [11002, 11016], // candle, lipstick
  [11004, 11005], // coffee, milkshake
  [11009, 11010], // ferris wheel, roller coaster
  [11014, 11021], // sunset, moon
  [11017, 11018], // dress, tie
  // travel
  [12001, 12015], // suitcase, backpack
  [12007, 12011], // beach umbrella, palm tree
  [12009, 12018], // ship, life ring
  [12013, 12016], // mountain, skis
  [12008, 12021], // sunglasses, sun
  // kitchen
  [13006, 13007], // egg, frying pan
  [13011, 13019], // strawberry, cherries
  [13014, 13015], // cookie, pancakes
  [13016, 13021], // bagel, donut
  // pets
  [14001, 14013, 14015], // cat, ball of yarn, paw print
  [14002, 14010, 14014, 14015], // dog, bone, tennis ball, paw print
  [14003, 14012], // fish, fish tank
  [14004, 14005], // bird, parrot
  [14006, 14009], // hamster, mouse
  // everyday
  [15001, 15002], // car, bus
  [15005, 15006, 15008], // rain, cloud, lightning
  // love
  [16001, 16002, 16008, 16017], // heart, broken heart, cupid's arrow, heart balloon
  [16005, 16012], // rose, bouquet
  [16009, 16010, 16011], // wedding dress, groom, wedding cake
  // special days
  [17003, 17016], // gift, bow
  [17004, 17006], // confetti, fireworks
  [17005, 17017], // party hat, top hat
  [17007, 17008], // santa, christmas tree
  [17009, 17010], // pumpkin, ghost
  [17013, 17014], // trophy, medal
];

function entryOf(word: string): WordEntry | undefined {
  const needle = word.trim().toLocaleLowerCase("tr");
  return EVERY_WORD.find((entry) => [entry.tr, entry.en, entry.de, entry.es].some((value) => value.toLocaleLowerCase("tr") === needle));
}

/** Ids that must not be offered next to this word (itself and its look-alikes). */
export function lookAlikeIds(id: number): Set<number> {
  const ids = new Set<number>([id]);
  for (const group of LOOK_ALIKE) if (group.includes(id)) group.forEach((other) => ids.add(other));
  return ids;
}

// Little words that don't make two answers look alike.
const FILLER = new Set(["the", "and", "for", "with", "der", "die", "das", "den", "dem", "des", "mit", "und", "ein", "eine", "auf", "von", "los", "las", "del", "con", "por", "para", "una", "uno", "bir", "ile"]);
function keyWords(value: string): Set<string> {
  return new Set(value.toLocaleLowerCase("tr").split(/[\s\-'’,.!?%]+/).filter((part) => part.length >= 3 && !FILLER.has(part)));
}

/**
 * Wrong-but-plausible answers from the word's own theme, for the drawer's guess buttons:
 * never a look-alike, and never an answer that shares a word with it ("Latte heart" /
 * "Broken heart"), so the right one can be picked at a glance.
 */
export function getDistractors(word: string, category: WordCategory | string, locale: Locale, count = 3): string[] {
  const entry = entryOf(word);
  const banned = entry ? lookAlikeIds(entry.id) : new Set<number>();
  const pool = (themeOf(word) || wordsOf(category)).filter((candidate) => !banned.has(candidate.id)).map((candidate) => localized(candidate, locale));
  const others = pool.filter((value) => value.toLocaleLowerCase("tr") !== word.toLocaleLowerCase("tr"));
  for (let i = others.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const mine = keyWords(word);
  const distinct = others.filter((value) => !Array.from(keyWords(value)).some((part) => mine.has(part)));
  const rest = others.filter((value) => !distinct.includes(value));
  return [...distinct, ...rest].slice(0, count);
}

/** The theme a word belongs to, e.g. "home" (null for unknown words). */
export function themeIdOf(word: string): WordCategory | null {
  const list = themeOf(word);
  if (!list) return null;
  const found = (Object.entries(THEMES) as Array<[WordCategory, WordEntry[]]>).find(([, words]) => words === list);
  return found ? found[0] : null;
}
