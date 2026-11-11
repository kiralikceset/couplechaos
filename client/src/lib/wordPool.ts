/**
 * Word pool — only concrete things you can actually DRAW.
 *
 * Every word has an emoji that is shown on the result screen next to the
 * players' drawing ("what it should have looked like"). Abstract words
 * (feelings, ideas, verbs) were removed after playtesting: they could only
 * be described, not drawn.
 */

import type { Locale } from "./i18n";

export type WordCategory = "daily" | "romantic" | "funny" | "hard" | "spicy";

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
  { id: "daily", emoji: "☀️", premium: false, nameKey: "cat.daily" },
  { id: "romantic", emoji: "💕", premium: false, nameKey: "cat.romantic" },
  { id: "funny", emoji: "😂", premium: false, nameKey: "cat.funny" },
  { id: "hard", emoji: "🧠", premium: true, nameKey: "cat.hard" },
  { id: "spicy", emoji: "🌶️", premium: true, nameKey: "cat.spicy" },
];

const DAILY_WORDS: WordEntry[] = [
  { id: 1, tr: "Kahve", en: "Coffee", de: "Kaffee", es: "Café", emoji: "☕" },
  { id: 2, tr: "Telefon", en: "Phone", de: "Telefon", es: "Teléfono", emoji: "📱" },
  { id: 3, tr: "Araba", en: "Car", de: "Auto", es: "Coche", emoji: "🚗" },
  { id: 4, tr: "Güneş", en: "Sun", de: "Sonne", es: "Sol", emoji: "☀️" },
  { id: 5, tr: "Şemsiye", en: "Umbrella", de: "Regenschirm", es: "Paraguas", emoji: "☂️" },
  { id: 6, tr: "Kitap", en: "Book", de: "Buch", es: "Libro", emoji: "📖" },
  { id: 7, tr: "Pizza", en: "Pizza", de: "Pizza", es: "Pizza", emoji: "🍕" },
  { id: 8, tr: "Köpek", en: "Dog", de: "Hund", es: "Perro", emoji: "🐶" },
  { id: 9, tr: "Kedi", en: "Cat", de: "Katze", es: "Gato", emoji: "🐱" },
  { id: 10, tr: "Ev", en: "House", de: "Haus", es: "Casa", emoji: "🏠" },
  { id: 11, tr: "Ağaç", en: "Tree", de: "Baum", es: "Árbol", emoji: "🌳" },
  { id: 12, tr: "Çiçek", en: "Flower", de: "Blume", es: "Flor", emoji: "🌸" },
  { id: 13, tr: "Dağ", en: "Mountain", de: "Berg", es: "Montaña", emoji: "⛰️" },
  { id: 14, tr: "Bulut", en: "Cloud", de: "Wolke", es: "Nube", emoji: "☁️" },
  { id: 15, tr: "Yıldız", en: "Star", de: "Stern", es: "Estrella", emoji: "⭐" },
  { id: 16, tr: "Ay", en: "Moon", de: "Mond", es: "Luna", emoji: "🌙" },
  { id: 17, tr: "Bisiklet", en: "Bicycle", de: "Fahrrad", es: "Bicicleta", emoji: "🚲" },
  { id: 18, tr: "Uçak", en: "Airplane", de: "Flugzeug", es: "Avión", emoji: "✈️" },
  { id: 19, tr: "Tren", en: "Train", de: "Zug", es: "Tren", emoji: "🚂" },
  { id: 20, tr: "Gemi", en: "Ship", de: "Schiff", es: "Barco", emoji: "🚢" },
  { id: 21, tr: "Balon", en: "Balloon", de: "Luftballon", es: "Globo", emoji: "🎈" },
  { id: 22, tr: "Anahtar", en: "Key", de: "Schlüssel", es: "Llave", emoji: "🔑" },
  { id: 23, tr: "Çalar saat", en: "Alarm clock", de: "Wecker", es: "Despertador", emoji: "⏰" },
  { id: 24, tr: "Gözlük", en: "Glasses", de: "Brille", es: "Gafas", emoji: "👓" },
  { id: 25, tr: "Şapka", en: "Hat", de: "Hut", es: "Sombrero", emoji: "🎩" },
  { id: 26, tr: "Spor ayakkabı", en: "Sneaker", de: "Turnschuh", es: "Zapatilla", emoji: "👟" },
  { id: 27, tr: "Çanta", en: "Handbag", de: "Handtasche", es: "Bolso", emoji: "👜" },
  { id: 28, tr: "Fotoğraf makinesi", en: "Camera", de: "Kamera", es: "Cámara", emoji: "📷" },
  { id: 29, tr: "Televizyon", en: "Television", de: "Fernseher", es: "Televisión", emoji: "📺" },
  { id: 30, tr: "Bilgisayar", en: "Laptop", de: "Laptop", es: "Portátil", emoji: "💻" },
  { id: 31, tr: "Kulaklık", en: "Headphones", de: "Kopfhörer", es: "Auriculares", emoji: "🎧" },
  { id: 32, tr: "Mum", en: "Candle", de: "Kerze", es: "Vela", emoji: "🕯️" },
  { id: 33, tr: "Kapı", en: "Door", de: "Tür", es: "Puerta", emoji: "🚪" },
  { id: 34, tr: "Sandalye", en: "Chair", de: "Stuhl", es: "Silla", emoji: "🪑" },
  { id: 35, tr: "Yatak", en: "Bed", de: "Bett", es: "Cama", emoji: "🛏️" },
  { id: 36, tr: "Kaşık", en: "Spoon", de: "Löffel", es: "Cuchara", emoji: "🥄" },
  { id: 37, tr: "Bıçak", en: "Knife", de: "Messer", es: "Cuchillo", emoji: "🔪" },
  { id: 38, tr: "Ampul", en: "Light bulb", de: "Glühbirne", es: "Bombilla", emoji: "💡" },
  { id: 39, tr: "Makas", en: "Scissors", de: "Schere", es: "Tijeras", emoji: "✂️" },
  { id: 40, tr: "Kalem", en: "Pencil", de: "Bleistift", es: "Lápiz", emoji: "✏️" },
  { id: 41, tr: "Pil", en: "Battery", de: "Batterie", es: "Pila", emoji: "🔋" },
  { id: 42, tr: "Ekmek", en: "Bread", de: "Brot", es: "Pan", emoji: "🍞" },
  { id: 43, tr: "Peynir", en: "Cheese", de: "Käse", es: "Queso", emoji: "🧀" },
  { id: 44, tr: "Yumurta", en: "Egg", de: "Ei", es: "Huevo", emoji: "🥚" },
  { id: 45, tr: "Süt", en: "Milk", de: "Milch", es: "Leche", emoji: "🥛" },
  { id: 46, tr: "Ateş", en: "Fire", de: "Feuer", es: "Fuego", emoji: "🔥" },
  { id: 47, tr: "Kardan adam", en: "Snowman", de: "Schneemann", es: "Muñeco de nieve", emoji: "⛄" },
  { id: 48, tr: "Gökkuşağı", en: "Rainbow", de: "Regenbogen", es: "Arcoíris", emoji: "🌈" },
  { id: 49, tr: "Kuş", en: "Bird", de: "Vogel", es: "Pájaro", emoji: "🐦" },
  { id: 50, tr: "Balık", en: "Fish", de: "Fisch", es: "Pez", emoji: "🐟" },
  { id: 51, tr: "Kelebek", en: "Butterfly", de: "Schmetterling", es: "Mariposa", emoji: "🦋" },
  { id: 52, tr: "Karınca", en: "Ant", de: "Ameise", es: "Hormiga", emoji: "🐜" },
  { id: 53, tr: "Örümcek", en: "Spider", de: "Spinne", es: "Araña", emoji: "🕷️" },
  { id: 54, tr: "Tavuk", en: "Chicken", de: "Huhn", es: "Gallina", emoji: "🐔" },
  { id: 55, tr: "İnek", en: "Cow", de: "Kuh", es: "Vaca", emoji: "🐄" },
  { id: 56, tr: "At", en: "Horse", de: "Pferd", es: "Caballo", emoji: "🐴" },
  { id: 57, tr: "Fil", en: "Elephant", de: "Elefant", es: "Elefante", emoji: "🐘" },
  { id: 58, tr: "Aslan", en: "Lion", de: "Löwe", es: "León", emoji: "🦁" },
  { id: 59, tr: "Maymun", en: "Monkey", de: "Affe", es: "Mono", emoji: "🐒" },
  { id: 60, tr: "Penguen", en: "Penguin", de: "Pinguin", es: "Pingüino", emoji: "🐧" },
  { id: 61, tr: "Timsah", en: "Crocodile", de: "Krokodil", es: "Cocodrilo", emoji: "🐊" },
  { id: 62, tr: "Yılan", en: "Snake", de: "Schlange", es: "Serpiente", emoji: "🐍" },
  { id: 63, tr: "Kaplumbağa", en: "Turtle", de: "Schildkröte", es: "Tortuga", emoji: "🐢" },
  { id: 64, tr: "Tavşan", en: "Rabbit", de: "Hase", es: "Conejo", emoji: "🐰" },
  { id: 65, tr: "Hamburger", en: "Hamburger", de: "Hamburger", es: "Hamburguesa", emoji: "🍔" },
  { id: 66, tr: "Dondurma", en: "Ice cream", de: "Eis", es: "Helado", emoji: "🍦" },
  { id: 67, tr: "Doğum günü pastası", en: "Birthday cake", de: "Geburtstagstorte", es: "Pastel de cumpleaños", emoji: "🎂" },
  { id: 68, tr: "Patates", en: "Potato", de: "Kartoffel", es: "Patata", emoji: "🥔" },
  { id: 69, tr: "Domates", en: "Tomato", de: "Tomate", es: "Tomate", emoji: "🍅" },
  { id: 70, tr: "Elma", en: "Apple", de: "Apfel", es: "Manzana", emoji: "🍎" },
  { id: 71, tr: "Muz", en: "Banana", de: "Banane", es: "Plátano", emoji: "🍌" },
  { id: 72, tr: "Çilek", en: "Strawberry", de: "Erdbeere", es: "Fresa", emoji: "🍓" },
  { id: 73, tr: "Karpuz", en: "Watermelon", de: "Wassermelone", es: "Sandía", emoji: "🍉" },
  { id: 74, tr: "Üzüm", en: "Grapes", de: "Trauben", es: "Uvas", emoji: "🍇" },
  { id: 75, tr: "Limon", en: "Lemon", de: "Zitrone", es: "Limón", emoji: "🍋" },
  { id: 76, tr: "Havuç", en: "Carrot", de: "Karotte", es: "Zanahoria", emoji: "🥕" },
  { id: 77, tr: "Mantar", en: "Mushroom", de: "Pilz", es: "Seta", emoji: "🍄" },
  { id: 78, tr: "Ananas", en: "Pineapple", de: "Ananas", es: "Piña", emoji: "🍍" },
  { id: 79, tr: "Kiraz", en: "Cherry", de: "Kirsche", es: "Cereza", emoji: "🍒" },
  { id: 80, tr: "Mısır", en: "Corn", de: "Mais", es: "Maíz", emoji: "🌽" },
  { id: 81, tr: "Ahtapot", en: "Octopus", de: "Krake", es: "Pulpo", emoji: "🐙" },
  { id: 82, tr: "Köpekbalığı", en: "Shark", de: "Hai", es: "Tiburón", emoji: "🦈" },
  { id: 83, tr: "Balina", en: "Whale", de: "Wal", es: "Ballena", emoji: "🐳" },
  { id: 84, tr: "Zürafa", en: "Giraffe", de: "Giraffe", es: "Jirafa", emoji: "🦒" },
  { id: 85, tr: "Domuz", en: "Pig", de: "Schwein", es: "Cerdo", emoji: "🐷" },
  { id: 86, tr: "Arı", en: "Bee", de: "Biene", es: "Abeja", emoji: "🐝" },
  { id: 87, tr: "Salyangoz", en: "Snail", de: "Schnecke", es: "Caracol", emoji: "🐌" },
  { id: 88, tr: "Baykuş", en: "Owl", de: "Eule", es: "Búho", emoji: "🦉" },
  { id: 89, tr: "Futbol topu", en: "Football", de: "Fußball", es: "Balón de fútbol", emoji: "⚽" },
  { id: 90, tr: "Gitar", en: "Guitar", de: "Gitarre", es: "Guitarra", emoji: "🎸" },
  { id: 91, tr: "Çadır", en: "Tent", de: "Zelt", es: "Tienda de campaña", emoji: "⛺" },
  { id: 92, tr: "Roket", en: "Rocket", de: "Rakete", es: "Cohete", emoji: "🚀" },
  { id: 93, tr: "Kupa", en: "Trophy", de: "Pokal", es: "Trofeo", emoji: "🏆" },
  { id: 94, tr: "Çekiç", en: "Hammer", de: "Hammer", es: "Martillo", emoji: "🔨" },
  { id: 95, tr: "Kaktüs", en: "Cactus", de: "Kaktus", es: "Cactus", emoji: "🌵" },
  { id: 96, tr: "Palmiye", en: "Palm tree", de: "Palme", es: "Palmera", emoji: "🌴" },
  { id: 97, tr: "Helikopter", en: "Helicopter", de: "Hubschrauber", es: "Helicóptero", emoji: "🚁" },
  { id: 98, tr: "Otobüs", en: "Bus", de: "Bus", es: "Autobús", emoji: "🚌" },
  { id: 99, tr: "Ayçiçeği", en: "Sunflower", de: "Sonnenblume", es: "Girasol", emoji: "🌻" },
  { id: 100, tr: "Sosisli sandviç", en: "Hot dog", de: "Hotdog", es: "Perrito caliente", emoji: "🌭" },
  { id: 101, tr: "Kurabiye", en: "Cookie", de: "Keks", es: "Galleta", emoji: "🍪" },
  { id: 102, tr: "Çorap", en: "Socks", de: "Socken", es: "Calcetines", emoji: "🧦" },
  { id: 103, tr: "Tişört", en: "T-shirt", de: "T-Shirt", es: "Camiseta", emoji: "👕" },
  { id: 104, tr: "Taç", en: "Crown", de: "Krone", es: "Corona", emoji: "👑" },
];

const ROMANTIC_WORDS: WordEntry[] = [
  { id: 1001, tr: "Kalp", en: "Heart", de: "Herz", es: "Corazón", emoji: "❤️" },
  { id: 1002, tr: "Öpücük", en: "Kiss", de: "Kuss", es: "Beso", emoji: "💋" },
  { id: 1003, tr: "Nişan yüzüğü", en: "Engagement ring", de: "Verlobungsring", es: "Anillo de compromiso", emoji: "💍" },
  { id: 1004, tr: "Kırmızı gül", en: "Red rose", de: "Rote Rose", es: "Rosa roja", emoji: "🌹" },
  { id: 1005, tr: "Çiçek buketi", en: "Bouquet", de: "Blumenstrauß", es: "Ramo de flores", emoji: "💐" },
  { id: 1006, tr: "Aşk mektubu", en: "Love letter", de: "Liebesbrief", es: "Carta de amor", emoji: "💌" },
  { id: 1007, tr: "Gelin", en: "Bride", de: "Braut", es: "Novia", emoji: "👰" },
  { id: 1008, tr: "Damat", en: "Groom", de: "Bräutigam", es: "Novio", emoji: "🤵" },
  { id: 1009, tr: "Düğün pastası", en: "Wedding cake", de: "Hochzeitstorte", es: "Pastel de boda", emoji: "🎂" },
  { id: 1010, tr: "Şarap kadehi", en: "Wine glass", de: "Weinglas", es: "Copa de vino", emoji: "🍷" },
  { id: 1011, tr: "Mum ışığında yemek", en: "Candlelight dinner", de: "Essen bei Kerzenlicht", es: "Cena con velas", emoji: "🕯️" },
  { id: 1012, tr: "Gün batımı", en: "Sunset", de: "Sonnenuntergang", es: "Atardecer", emoji: "🌅" },
  { id: 1013, tr: "Aşk oku", en: "Cupid's arrow", de: "Amors Pfeil", es: "Flecha de Cupido", emoji: "💘" },
  { id: 1014, tr: "Oyuncak ayı", en: "Teddy bear", de: "Teddybär", es: "Osito de peluche", emoji: "🧸" },
  { id: 1015, tr: "Çikolata", en: "Chocolate", de: "Schokolade", es: "Chocolate", emoji: "🍫" },
  { id: 1016, tr: "Dans eden çift", en: "Dancing couple", de: "Tanzendes Paar", es: "Pareja bailando", emoji: "💃" },
  { id: 1017, tr: "El ele çift", en: "Couple holding hands", de: "Händchen haltendes Paar", es: "Pareja de la mano", emoji: "👫" },
  { id: 1018, tr: "Piknik sepeti", en: "Picnic basket", de: "Picknickkorb", es: "Cesta de picnic", emoji: "🧺" },
  { id: 1019, tr: "Plaj", en: "Beach", de: "Strand", es: "Playa", emoji: "🏖️" },
  { id: 1020, tr: "Kuğu", en: "Swan", de: "Schwan", es: "Cisne", emoji: "🦢" },
  { id: 1021, tr: "Havai fişek", en: "Fireworks", de: "Feuerwerk", es: "Fuegos artificiales", emoji: "🎆" },
  { id: 1022, tr: "Papatya", en: "Daisy", de: "Gänseblümchen", es: "Margarita", emoji: "🌼" },
  { id: 1023, tr: "Selfie", en: "Selfie", de: "Selfie", es: "Selfie", emoji: "🤳" },
  { id: 1024, tr: "Aşk kilidi", en: "Love lock", de: "Liebesschloss", es: "Candado del amor", emoji: "🔒" },
  { id: 1025, tr: "Dolunay", en: "Full moon", de: "Vollmond", es: "Luna llena", emoji: "🌕" },
  { id: 1026, tr: "Yıldız kayması", en: "Shooting star", de: "Sternschnuppe", es: "Estrella fugaz", emoji: "🌠" },
  { id: 1027, tr: "Sevgililer kartı", en: "Valentine card", de: "Valentinskarte", es: "Tarjeta de San Valentín", emoji: "💝" },
  { id: 1028, tr: "Bal", en: "Honey", de: "Honig", es: "Miel", emoji: "🍯" },
  { id: 1029, tr: "Öpücük atan surat", en: "Blowing a kiss", de: "Kusshand", es: "Lanzar un beso", emoji: "😘" },
  { id: 1030, tr: "Aşık surat", en: "Face in love", de: "Verliebtes Gesicht", es: "Cara enamorada", emoji: "😍" },
  { id: 1031, tr: "Kırık kalp", en: "Broken heart", de: "Gebrochenes Herz", es: "Corazón roto", emoji: "💔" },
  { id: 1032, tr: "Melek", en: "Angel", de: "Engel", es: "Ángel", emoji: "👼" },
  { id: 1033, tr: "Gondol", en: "Gondola", de: "Gondel", es: "Góndola", emoji: "🛶" },
  { id: 1034, tr: "Eyfel Kulesi", en: "Eiffel Tower", de: "Eiffelturm", es: "Torre Eiffel", emoji: "🗼" },
  { id: 1035, tr: "Hediye paketi", en: "Gift box", de: "Geschenk", es: "Regalo", emoji: "🎁" },
  { id: 1036, tr: "Tandem bisiklet", en: "Tandem bike", de: "Tandem", es: "Bicicleta tándem", emoji: "🚲" },
  { id: 1037, tr: "Kumdan kale", en: "Sandcastle", de: "Sandburg", es: "Castillo de arena", emoji: "🏰" },
  { id: 1038, tr: "Sıcak çikolata", en: "Hot chocolate", de: "Heiße Schokolade", es: "Chocolate caliente", emoji: "☕" },
  { id: 1039, tr: "Çiftin evi", en: "Couple's home", de: "Gemeinsames Zuhause", es: "Hogar de la pareja", emoji: "🏡" },
  { id: 1040, tr: "Balayı uçağı", en: "Honeymoon flight", de: "Flitterwochenflug", es: "Vuelo de luna de miel", emoji: "✈️" },
  { id: 1041, tr: "Kalpli balon", en: "Heart balloon", de: "Herzballon", es: "Globo de corazón", emoji: "🎈" },
  { id: 1042, tr: "Fal kurabiyesi", en: "Fortune cookie", de: "Glückskeks", es: "Galleta de la fortuna", emoji: "🥠" },
  { id: 1043, tr: "Pamuk şeker", en: "Cotton candy", de: "Zuckerwatte", es: "Algodón de azúcar", emoji: "🍭" },
  { id: 1044, tr: "Dönme dolap", en: "Ferris wheel", de: "Riesenrad", es: "Noria", emoji: "🎡" },
];

const FUNNY_WORDS: WordEntry[] = [
  { id: 2001, tr: "Zombi", en: "Zombie", de: "Zombie", es: "Zombi", emoji: "🧟" },
  { id: 2002, tr: "Uzaylı", en: "Alien", de: "Außerirdischer", es: "Extraterrestre", emoji: "👽" },
  { id: 2003, tr: "Palyaço", en: "Clown", de: "Clown", es: "Payaso", emoji: "🤡" },
  { id: 2004, tr: "Korsan", en: "Pirate", de: "Pirat", es: "Pirata", emoji: "🏴‍☠️" },
  { id: 2005, tr: "Ninja", en: "Ninja", de: "Ninja", es: "Ninja", emoji: "🥷" },
  { id: 2006, tr: "Süper kahraman", en: "Superhero", de: "Superheld", es: "Superhéroe", emoji: "🦸" },
  { id: 2007, tr: "Dinozor", en: "Dinosaur", de: "Dinosaurier", es: "Dinosaurio", emoji: "🦖" },
  { id: 2008, tr: "Unicorn", en: "Unicorn", de: "Einhorn", es: "Unicornio", emoji: "🦄" },
  { id: 2009, tr: "Vampir", en: "Vampire", de: "Vampir", es: "Vampiro", emoji: "🧛" },
  { id: 2010, tr: "Hayalet", en: "Ghost", de: "Geist", es: "Fantasma", emoji: "👻" },
  { id: 2011, tr: "Büyücü", en: "Wizard", de: "Zauberer", es: "Mago", emoji: "🧙" },
  { id: 2012, tr: "Robot", en: "Robot", de: "Roboter", es: "Robot", emoji: "🤖" },
  { id: 2013, tr: "Tuvalet kağıdı", en: "Toilet paper", de: "Klopapier", es: "Papel higiénico", emoji: "🧻" },
  { id: 2014, tr: "Hapşıran surat", en: "Sneezing face", de: "Niesendes Gesicht", es: "Cara estornudando", emoji: "🤧" },
  { id: 2015, tr: "Kaka", en: "Poop", de: "Kacke", es: "Caca", emoji: "💩" },
  { id: 2016, tr: "Sarhoş surat", en: "Drunk face", de: "Betrunkenes Gesicht", es: "Cara borracha", emoji: "🥴" },
  { id: 2017, tr: "Horlayan adam", en: "Snoring man", de: "Schnarchender Mann", es: "Hombre roncando", emoji: "😴" },
  { id: 2018, tr: "Kafası patlayan", en: "Mind blown", de: "Explodierender Kopf", es: "Cabeza explotando", emoji: "🤯" },
  { id: 2019, tr: "Deniz kızı", en: "Mermaid", de: "Meerjungfrau", es: "Sirena", emoji: "🧜‍♀️" },
  { id: 2020, tr: "Peri", en: "Fairy", de: "Fee", es: "Hada", emoji: "🧚" },
  { id: 2021, tr: "Lambadan çıkan cin", en: "Genie", de: "Dschinn", es: "Genio de la lámpara", emoji: "🧞" },
  { id: 2022, tr: "Ejderha", en: "Dragon", de: "Drache", es: "Dragón", emoji: "🐉" },
  { id: 2023, tr: "İskelet", en: "Skeleton", de: "Skelett", es: "Esqueleto", emoji: "💀" },
  { id: 2024, tr: "Beyin", en: "Brain", de: "Gehirn", es: "Cerebro", emoji: "🧠" },
  { id: 2025, tr: "Canavar", en: "Monster", de: "Monster", es: "Monstruo", emoji: "👹" },
  { id: 2026, tr: "Kovboy", en: "Cowboy", de: "Cowboy", es: "Vaquero", emoji: "🤠" },
  { id: 2027, tr: "Astronot", en: "Astronaut", de: "Astronaut", es: "Astronauta", emoji: "🧑‍🚀" },
  { id: 2028, tr: "Hız treni", en: "Roller coaster", de: "Achterbahn", es: "Montaña rusa", emoji: "🎢" },
  { id: 2029, tr: "Lolipop", en: "Lollipop", de: "Lutscher", es: "Piruleta", emoji: "🍭" },
  { id: 2030, tr: "Sihirli değnek", en: "Magic wand", de: "Zauberstab", es: "Varita mágica", emoji: "🪄" },
  { id: 2031, tr: "Kristal küre", en: "Crystal ball", de: "Kristallkugel", es: "Bola de cristal", emoji: "🔮" },
  { id: 2032, tr: "Hazine haritası", en: "Treasure map", de: "Schatzkarte", es: "Mapa del tesoro", emoji: "🗺️" },
  { id: 2033, tr: "Para çuvalı", en: "Money bag", de: "Geldsack", es: "Bolsa de dinero", emoji: "💰" },
  { id: 2034, tr: "UFO", en: "UFO", de: "UFO", es: "OVNI", emoji: "🛸" },
  { id: 2035, tr: "Dev dalga", en: "Giant wave", de: "Riesenwelle", es: "Ola gigante", emoji: "🌊" },
  { id: 2036, tr: "Hortum", en: "Tornado", de: "Tornado", es: "Tornado", emoji: "🌪️" },
  { id: 2037, tr: "Göktaşı", en: "Meteor", de: "Meteor", es: "Meteorito", emoji: "☄️" },
  { id: 2038, tr: "Bomba", en: "Bomb", de: "Bombe", es: "Bomba", emoji: "💣" },
  { id: 2039, tr: "Konfeti", en: "Confetti", de: "Konfetti", es: "Confeti", emoji: "🎉" },
  { id: 2040, tr: "Sinek", en: "Fly", de: "Fliege", es: "Mosca", emoji: "🪰" },
  { id: 2041, tr: "Hamamböceği", en: "Cockroach", de: "Kakerlake", es: "Cucaracha", emoji: "🪳" },
  { id: 2042, tr: "Solucan", en: "Worm", de: "Wurm", es: "Gusano", emoji: "🪱" },
  { id: 2043, tr: "Bebek", en: "Baby", de: "Baby", es: "Bebé", emoji: "👶" },
  { id: 2044, tr: "Biberon", en: "Baby bottle", de: "Babyflasche", es: "Biberón", emoji: "🍼" },
  { id: 2045, tr: "Karateci", en: "Karate fighter", de: "Karatekämpfer", es: "Karateca", emoji: "🥋" },
  { id: 2046, tr: "Boks eldiveni", en: "Boxing glove", de: "Boxhandschuh", es: "Guante de boxeo", emoji: "🥊" },
  { id: 2047, tr: "Yoga yapan adam", en: "Man doing yoga", de: "Mann beim Yoga", es: "Hombre haciendo yoga", emoji: "🧘" },
  { id: 2048, tr: "Kılıç", en: "Sword", de: "Schwert", es: "Espada", emoji: "🗡️" },
  { id: 2049, tr: "Kalkan", en: "Shield", de: "Schild", es: "Escudo", emoji: "🛡️" },
  { id: 2050, tr: "Piñata", en: "Pi\u00f1ata", de: "Piñata", es: "Piñata", emoji: "🪅" },
  { id: 2051, tr: "Matruşka", en: "Nesting doll", de: "Matroschka", es: "Matrioska", emoji: "🪆" },
  { id: 2052, tr: "Patlamış mısır", en: "Popcorn", de: "Popcorn", es: "Palomitas", emoji: "🍿" },
  { id: 2053, tr: "Terlik", en: "Flip-flop", de: "Flip-Flop", es: "Chancla", emoji: "🩴" },
  { id: 2054, tr: "Kusan surat", en: "Vomiting face", de: "Kotzendes Gesicht", es: "Cara vomitando", emoji: "🤮" },
  { id: 2055, tr: "Yalan söyleyen Pinokyo", en: "Lying Pinocchio", de: "Lügender Pinocchio", es: "Pinocho mintiendo", emoji: "🤥" },
  { id: 2056, tr: "Kurbağa", en: "Frog", de: "Frosch", es: "Rana", emoji: "🐸" },
  { id: 2057, tr: "Tembel hayvan", en: "Sloth", de: "Faultier", es: "Perezoso", emoji: "🦥" },
  { id: 2058, tr: "Lama", en: "Llama", de: "Lama", es: "Llama", emoji: "🦙" },
  { id: 2059, tr: "Kanguru", en: "Kangaroo", de: "Känguru", es: "Canguro", emoji: "🦘" },
  { id: 2060, tr: "Tavus kuşu", en: "Peacock", de: "Pfau", es: "Pavo real", emoji: "🦚" },
];

const HARD_WORDS: WordEntry[] = [
  { id: 3001, tr: "Mikroskop", en: "Microscope", de: "Mikroskop", es: "Microscopio", emoji: "🔬" },
  { id: 3002, tr: "Teleskop", en: "Telescope", de: "Teleskop", es: "Telescopio", emoji: "🔭" },
  { id: 3003, tr: "DNA sarmalı", en: "DNA helix", de: "DNA-Helix", es: "Hélice de ADN", emoji: "🧬" },
  { id: 3004, tr: "Atom", en: "Atom", de: "Atom", es: "Átomo", emoji: "⚛️" },
  { id: 3005, tr: "Mıknatıs", en: "Magnet", de: "Magnet", es: "Imán", emoji: "🧲" },
  { id: 3006, tr: "Satürn", en: "Saturn", de: "Saturn", es: "Saturno", emoji: "🪐" },
  { id: 3007, tr: "Galaksi", en: "Galaxy", de: "Galaxie", es: "Galaxia", emoji: "🌌" },
  { id: 3008, tr: "Yanardağ", en: "Volcano", de: "Vulkan", es: "Volcán", emoji: "🌋" },
  { id: 3009, tr: "Özgürlük Heykeli", en: "Statue of Liberty", de: "Freiheitsstatue", es: "Estatua de la Libertad", emoji: "🗽" },
  { id: 3010, tr: "Japon tapınağı", en: "Shinto shrine", de: "Shinto-Schrein", es: "Santuario sintoísta", emoji: "⛩️" },
  { id: 3011, tr: "Cami", en: "Mosque", de: "Moschee", es: "Mezquita", emoji: "🕌" },
  { id: 3012, tr: "Kilise", en: "Church", de: "Kirche", es: "Iglesia", emoji: "⛪" },
  { id: 3013, tr: "Köprü", en: "Bridge", de: "Brücke", es: "Puente", emoji: "🌉" },
  { id: 3014, tr: "Sirk çadırı", en: "Circus tent", de: "Zirkuszelt", es: "Carpa de circo", emoji: "🎪" },
  { id: 3015, tr: "Uydu", en: "Satellite", de: "Satellit", es: "Satélite", emoji: "🛰️" },
  { id: 3016, tr: "Paraşüt", en: "Parachute", de: "Fallschirm", es: "Paracaídas", emoji: "🪂" },
  { id: 3017, tr: "Tren rayı", en: "Railway track", de: "Bahngleis", es: "Vía de tren", emoji: "🛤️" },
  { id: 3018, tr: "Benzin pompası", en: "Fuel pump", de: "Zapfsäule", es: "Surtidor de gasolina", emoji: "⛽" },
  { id: 3019, tr: "Trafik lambası", en: "Traffic light", de: "Ampel", es: "Semáforo", emoji: "🚦" },
  { id: 3020, tr: "İtfaiye arabası", en: "Fire engine", de: "Feuerwehrauto", es: "Camión de bomberos", emoji: "🚒" },
  { id: 3021, tr: "Polis arabası", en: "Police car", de: "Polizeiauto", es: "Coche de policía", emoji: "🚓" },
  { id: 3022, tr: "Traktör", en: "Tractor", de: "Traktor", es: "Tractor", emoji: "🚜" },
  { id: 3023, tr: "Vinç", en: "Crane", de: "Kran", es: "Grúa", emoji: "🏗️" },
  { id: 3024, tr: "Fabrika", en: "Factory", de: "Fabrik", es: "Fábrica", emoji: "🏭" },
  { id: 3025, tr: "Mikrofon", en: "Microphone", de: "Mikrofon", es: "Micrófono", emoji: "🎤" },
  { id: 3026, tr: "Piyano", en: "Piano", de: "Klavier", es: "Piano", emoji: "🎹" },
  { id: 3027, tr: "Keman", en: "Violin", de: "Geige", es: "Violín", emoji: "🎻" },
  { id: 3028, tr: "Davul", en: "Drum", de: "Trommel", es: "Tambor", emoji: "🥁" },
  { id: 3029, tr: "Trompet", en: "Trumpet", de: "Trompete", es: "Trompeta", emoji: "🎺" },
  { id: 3030, tr: "Satranç piyonu", en: "Chess pawn", de: "Schachbauer", es: "Peón de ajedrez", emoji: "♟️" },
  { id: 3031, tr: "Zar", en: "Dice", de: "Würfel", es: "Dado", emoji: "🎲" },
  { id: 3032, tr: "Yapboz parçası", en: "Puzzle piece", de: "Puzzleteil", es: "Pieza de puzle", emoji: "🧩" },
  { id: 3033, tr: "Bowling", en: "Bowling", de: "Bowling", es: "Bolos", emoji: "🎳" },
  { id: 3034, tr: "Kayakçı", en: "Skier", de: "Skifahrer", es: "Esquiador", emoji: "⛷️" },
  { id: 3035, tr: "Sörfçü", en: "Surfer", de: "Surfer", es: "Surfista", emoji: "🏄" },
  { id: 3036, tr: "Dalgıç maskesi", en: "Diving mask", de: "Taucherbrille", es: "Máscara de buceo", emoji: "🤿" },
  { id: 3037, tr: "Ok ve yay", en: "Bow and arrow", de: "Pfeil und Bogen", es: "Arco y flecha", emoji: "🏹" },
  { id: 3038, tr: "Pusula", en: "Compass", de: "Kompass", es: "Brújula", emoji: "🧭" },
  { id: 3039, tr: "Kum saati", en: "Hourglass", de: "Sanduhr", es: "Reloj de arena", emoji: "⌛" },
  { id: 3040, tr: "Termometre", en: "Thermometer", de: "Thermometer", es: "Termómetro", emoji: "🌡️" },
  { id: 3041, tr: "Şırınga", en: "Syringe", de: "Spritze", es: "Jeringa", emoji: "💉" },
  { id: 3042, tr: "Diş", en: "Tooth", de: "Zahn", es: "Diente", emoji: "🦷" },
  { id: 3043, tr: "Kemik", en: "Bone", de: "Knochen", es: "Hueso", emoji: "🦴" },
  { id: 3044, tr: "Akciğer", en: "Lungs", de: "Lunge", es: "Pulmones", emoji: "🫁" },
  { id: 3045, tr: "Ayak izi", en: "Footprints", de: "Fußspuren", es: "Huellas", emoji: "👣" },
  { id: 3046, tr: "Kar tanesi", en: "Snowflake", de: "Schneeflocke", es: "Copo de nieve", emoji: "❄️" },
  { id: 3047, tr: "Bilgisayar faresi", en: "Computer mouse", de: "Computermaus", es: "Ratón de ordenador", emoji: "🖱️" },
  { id: 3048, tr: "Klavye", en: "Keyboard", de: "Tastatur", es: "Teclado", emoji: "⌨️" },
  { id: 3049, tr: "Disket", en: "Floppy disk", de: "Diskette", es: "Disquete", emoji: "💾" },
  { id: 3050, tr: "Ada", en: "Desert island", de: "Insel", es: "Isla", emoji: "🏝️" },
  { id: 3051, tr: "Çöl", en: "Desert", de: "Wüste", es: "Desierto", emoji: "🏜️" },
  { id: 3052, tr: "Kale", en: "Castle", de: "Burg", es: "Castillo", emoji: "🏯" },
];

const SPICY_WORDS: WordEntry[] = [
  { id: 4001, tr: "Ruj", en: "Lipstick", de: "Lippenstift", es: "Pintalabios", emoji: "💄" },
  { id: 4002, tr: "Topuklu ayakkabı", en: "High heel", de: "High Heel", es: "Tacón alto", emoji: "👠" },
  { id: 4003, tr: "Bikini", en: "Bikini", de: "Bikini", es: "Bikini", emoji: "👙" },
  { id: 4004, tr: "Dudaklar", en: "Lips", de: "Lippen", es: "Labios", emoji: "👄" },
  { id: 4005, tr: "Sinsi gülüş", en: "Smirk", de: "Grinsen", es: "Sonrisa pícara", emoji: "😏" },
  { id: 4006, tr: "Şeytan", en: "Devil", de: "Teufel", es: "Diablo", emoji: "😈" },
  { id: 4007, tr: "Acı biber", en: "Chili pepper", de: "Chilischote", es: "Chile", emoji: "🌶️" },
  { id: 4008, tr: "Şeftali", en: "Peach", de: "Pfirsich", es: "Melocotón", emoji: "🍑" },
  { id: 4009, tr: "Patlıcan", en: "Eggplant", de: "Aubergine", es: "Berenjena", emoji: "🍆" },
  { id: 4010, tr: "Kokteyl", en: "Cocktail", de: "Cocktail", es: "Cóctel", emoji: "🍸" },
  { id: 4011, tr: "Viski", en: "Whisky", de: "Whisky", es: "Whisky", emoji: "🥃" },
  { id: 4012, tr: "Şampanya", en: "Champagne", de: "Champagner", es: "Champán", emoji: "🍾" },
  { id: 4013, tr: "Masaj", en: "Massage", de: "Massage", es: "Masaje", emoji: "💆" },
  { id: 4014, tr: "Duş", en: "Shower", de: "Dusche", es: "Ducha", emoji: "🚿" },
  { id: 4015, tr: "Köpük banyosu", en: "Bubble bath", de: "Schaumbad", es: "Baño de espuma", emoji: "🛁" },
  { id: 4016, tr: "Zincir", en: "Chain", de: "Kette", es: "Cadena", emoji: "⛓️" },
  { id: 4017, tr: "Göz kırpan surat", en: "Winking face", de: "Zwinkerndes Gesicht", es: "Cara guiñando", emoji: "😉" },
  { id: 4018, tr: "Mayo", en: "Swimsuit", de: "Badeanzug", es: "Bañador", emoji: "🩱" },
  { id: 4019, tr: "Melek ve şeytan", en: "Angel and devil", de: "Engel und Teufel", es: "Ángel y demonio", emoji: "😇😈" },
  { id: 4020, tr: "Polis kostümü", en: "Police costume", de: "Polizeikostüm", es: "Disfraz de policía", emoji: "👮" },
  { id: 4021, tr: "Hemşire kostümü", en: "Nurse costume", de: "Krankenschwester-Kostüm", es: "Disfraz de enfermera", emoji: "👩‍⚕️" },
  { id: 4022, tr: "İtfaiyeci", en: "Firefighter", de: "Feuerwehrmann", es: "Bombero", emoji: "🧑‍🚒" },
  { id: 4023, tr: "Otel odası", en: "Hotel room", de: "Hotelzimmer", es: "Habitación de hotel", emoji: "🏨" },
  { id: 4024, tr: "Gece manzarası", en: "Night skyline", de: "Nachtskyline", es: "Ciudad de noche", emoji: "🌃" },
  { id: 4025, tr: "Ayna selfiesi", en: "Mirror selfie", de: "Spiegel-Selfie", es: "Selfie en el espejo", emoji: "🤳" },
  { id: 4026, tr: "Krem şanti", en: "Whipped cream", de: "Schlagsahne", es: "Nata montada", emoji: "🍨" },
  { id: 4027, tr: "Buz küpü", en: "Ice cube", de: "Eiswürfel", es: "Cubito de hielo", emoji: "🧊" },
  { id: 4028, tr: "Tüy", en: "Feather", de: "Feder", es: "Pluma", emoji: "🪶" },
  { id: 4029, tr: "Ter damlası", en: "Sweat drop", de: "Schweißtropfen", es: "Gota de sudor", emoji: "💦" },
  { id: 4030, tr: "Ateşli surat", en: "Hot face", de: "Heißes Gesicht", es: "Cara acalorada", emoji: "🥵" },
  { id: 4031, tr: "Gizli bakış", en: "Peeking eyes", de: "Spähende Augen", es: "Ojos espiando", emoji: "👀" },
  { id: 4032, tr: "Kilitli kalp", en: "Locked heart", de: "Verschlossenes Herz", es: "Corazón con candado", emoji: "🔐" },
  { id: 4033, tr: "Elmas", en: "Diamond", de: "Diamant", es: "Diamante", emoji: "💎" },
];

const ALL_WORDS: Record<WordCategory, WordEntry[]> = {
  daily: DAILY_WORDS,
  romantic: ROMANTIC_WORDS,
  funny: FUNNY_WORDS,
  hard: HARD_WORDS,
  spicy: SPICY_WORDS,
};

const EVERY_WORD: WordEntry[] = Object.values(ALL_WORDS).flat();

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

export function pickWord(category: WordCategory, locale: Locale): PickedWord {
  const words = ALL_WORDS[category] || DAILY_WORDS;
  let available = words.filter((w) => !usedWordIds.has(w.id));
  if (available.length === 0) {
    words.forEach((w) => usedWordIds.delete(w.id));
    available = words;
  }
  const entry = available[Math.floor(Math.random() * available.length)];
  usedWordIds.add(entry.id);
  return { id: entry.id, word: localized(entry, locale), emoji: entry.emoji, category };
}

export function getRandomWord(category: WordCategory, locale: Locale): string {
  return pickWord(category, locale).word;
}

export function getRandomWordFromFreeCategories(locale: Locale): string {
  const freeCategories: WordCategory[] = ["daily", "romantic", "funny"];
  const category = freeCategories[Math.floor(Math.random() * freeCategories.length)];
  return getRandomWord(category, locale);
}

export function getDailyWord(locale: Locale): { word: string; category: WordCategory; emoji: string } {
  // Date as seed → everyone gets the same word today.
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const allFreeWords = [...DAILY_WORDS, ...ROMANTIC_WORDS, ...FUNNY_WORDS];
  const index = seed % allFreeWords.length;
  const word = allFreeWords[index];
  let category: WordCategory = "daily";
  if (index >= DAILY_WORDS.length + ROMANTIC_WORDS.length) category = "funny";
  else if (index >= DAILY_WORDS.length) category = "romantic";
  return { word: localized(word, locale), category, emoji: word.emoji };
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

export function getCategoryWordCount(category: WordCategory): number {
  return ALL_WORDS[category]?.length || 0;
}

export function resetUsedWords(): void {
  usedWordIds.clear();
}
