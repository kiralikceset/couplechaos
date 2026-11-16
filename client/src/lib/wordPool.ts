/**
 * Word pool: short, drawable things from life as a couple ("Pillow fight", "Suitcase",
 * "Cat on the keyboard"), grouped by theme. Every scene can be drawn in 20 seconds and is
 * clean enough for all ages. "Mixed" mixes them all.
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
  { id: 10001, tr: "Battaniye kavgası", en: "Blanket tug-of-war", de: "Kampf um die Decke", es: "Pelea por la manta", emoji: "🛏️" },
  { id: 10002, tr: "Horlayan sevgili", en: "Snoring partner", de: "Schnarchender Partner", es: "Pareja que ronca", emoji: "😴" },
  { id: 10003, tr: "Kumanda kavgası", en: "Fight over the remote", de: "Streit um die Fernbedienung", es: "Pelea por el mando", emoji: "📺" },
  { id: 10004, tr: "Bulaşık dağı", en: "Pile of dishes", de: "Geschirrberg", es: "Montaña de platos", emoji: "🫧" },
  { id: 10005, tr: "Çamaşır dağı", en: "Laundry pile", de: "Wäscheberg", es: "Montaña de ropa", emoji: "👕" },
  { id: 10006, tr: "Klozet kapağı", en: "Toilet seat up", de: "Klobrille oben", es: "Tapa del váter", emoji: "🚽" },
  { id: 10007, tr: "Tuvalet kağıdı", en: "Toilet paper", de: "Klopapier", es: "Papel higiénico", emoji: "🧻" },
  { id: 10008, tr: "Mobilya kurmak", en: "Building furniture", de: "Möbel aufbauen", es: "Montar muebles", emoji: "🪛" },
  { id: 10009, tr: "Örümcek paniği", en: "Spider panic", de: "Spinnenalarm", es: "Pánico a la araña", emoji: "🕷️" },
  { id: 10010, tr: "Duşta şarkı", en: "Shower singing", de: "Singen unter der Dusche", es: "Cantar en la ducha", emoji: "🚿" },
  { id: 10011, tr: "Dağınık saç", en: "Bed hair", de: "Wuschelhaare", es: "Pelo revuelto", emoji: "💇" },
  { id: 10012, tr: "Çalar saat", en: "Alarm clock", de: "Wecker", es: "Despertador", emoji: "⏰" },
  { id: 10013, tr: "Kanepede uyumak", en: "Couch nap", de: "Sofaschläfchen", es: "Siesta en el sofá", emoji: "💤" },
  { id: 10014, tr: "Ütü yapmak", en: "Ironing", de: "Bügeln", es: "Planchar", emoji: "👔" },
  { id: 10015, tr: "Şarj bitti", en: "Dead battery", de: "Akku leer", es: "Sin batería", emoji: "🪫" },
  { id: 10016, tr: "İnternet gitti", en: "Wi-Fi is down", de: "WLAN ist weg", es: "Se cayó el wifi", emoji: "📶" },
  { id: 10017, tr: "Dizi maratonu", en: "Binge-watching", de: "Serienmarathon", es: "Maratón de series", emoji: "🍿" },
  { id: 10018, tr: "Yastık savaşı", en: "Pillow fight", de: "Kissenschlacht", es: "Guerra de almohadas", emoji: "🪶" },
  { id: 10019, tr: "Evde spor", en: "Home workout", de: "Training zu Hause", es: "Ejercicio en casa", emoji: "🏋️" },
  { id: 10020, tr: "Çöp çıkarmak", en: "Taking out the trash", de: "Müll rausbringen", es: "Sacar la basura", emoji: "🗑️" },
  { id: 10021, tr: "Kuruyan çiçek", en: "Dead plant", de: "Vertrocknete Pflanze", es: "Planta marchita", emoji: "🥀" },
  { id: 10022, tr: "Kirli çorap", en: "Dirty socks", de: "Dreckige Socken", es: "Calcetines sucios", emoji: "🧦" },
];

const DATE_SCENES: WordEntry[] = [
  { id: 11001, tr: "Sinema gecesi", en: "Movie night", de: "Kinoabend", es: "Noche de cine", emoji: "🎬" },
  { id: 11002, tr: "Mumlu yemek", en: "Candlelit dinner", de: "Candlelight-Dinner", es: "Cena con velas", emoji: "🕯️" },
  { id: 11003, tr: "Dans pisti", en: "Dance floor", de: "Tanzfläche", es: "Pista de baile", emoji: "🪩" },
  { id: 11004, tr: "Kahve randevusu", en: "Coffee date", de: "Kaffee-Date", es: "Cita para un café", emoji: "☕" },
  { id: 11005, tr: "Patlamış mısır", en: "Popcorn", de: "Popcorn", es: "Palomitas", emoji: "🍿" },
  { id: 11006, tr: "Korku filmi", en: "Horror movie", de: "Horrorfilm", es: "Peli de terror", emoji: "👻" },
  { id: 11007, tr: "Milkshake", en: "Milkshake", de: "Milchshake", es: "Batido", emoji: "🥤" },
  { id: 11008, tr: "Çarpışan arabalar", en: "Bumper cars", de: "Autoscooter", es: "Coches de choque", emoji: "🏎️" },
  { id: 11009, tr: "Gün batımı", en: "Sunset", de: "Sonnenuntergang", es: "Atardecer", emoji: "🌅" },
  { id: 11010, tr: "Piknik", en: "Picnic", de: "Picknick", es: "Pícnic", emoji: "🧺" },
  { id: 11011, tr: "Bowling", en: "Bowling", de: "Bowling", es: "Bolos", emoji: "🎳" },
  { id: 11012, tr: "Karaoke", en: "Karaoke", de: "Karaoke", es: "Karaoke", emoji: "🎤" },
  { id: 11013, tr: "Oyuncak ayı", en: "Teddy bear", de: "Teddybär", es: "Osito de peluche", emoji: "🧸" },
  { id: 11014, tr: "Buz pateni", en: "Ice skating", de: "Eislaufen", es: "Patinaje sobre hielo", emoji: "⛸️" },
  { id: 11015, tr: "Dönme dolap", en: "Ferris wheel", de: "Riesenrad", es: "Noria", emoji: "🎡" },
  { id: 11016, tr: "Şemsiye altında", en: "Under the umbrella", de: "Unterm Regenschirm", es: "Bajo el paraguas", emoji: "🌂" },
  { id: 11017, tr: "Kırmızı gül", en: "Red rose", de: "Rote Rose", es: "Rosa roja", emoji: "🌹" },
  { id: 11018, tr: "Mesajlaşmak", en: "Texting", de: "Chatten", es: "Chatear", emoji: "📱" },
  { id: 11019, tr: "Garson", en: "Waiter", de: "Kellner", es: "Camarero", emoji: "🤵" },
  { id: 11020, tr: "Tandem bisiklet", en: "Tandem bike", de: "Tandem", es: "Tándem", emoji: "🚴" },
  { id: 11021, tr: "Fotoğraf kabini", en: "Photo booth", de: "Fotoautomat", es: "Fotomatón", emoji: "📸" },
];

const TRAVEL_SCENES: WordEntry[] = [
  { id: 12001, tr: "Valiz", en: "Suitcase", de: "Koffer", es: "Maleta", emoji: "🧳" },
  { id: 12002, tr: "Güneş yanığı", en: "Sunburn", de: "Sonnenbrand", es: "Quemadura de sol", emoji: "🥵" },
  { id: 12003, tr: "Uçak", en: "Airplane", de: "Flugzeug", es: "Avión", emoji: "✈️" },
  { id: 12004, tr: "Sırt çantası", en: "Backpack", de: "Rucksack", es: "Mochila", emoji: "🎒" },
  { id: 12005, tr: "Yolcu gemisi", en: "Cruise ship", de: "Kreuzfahrtschiff", es: "Crucero", emoji: "🚢" },
  { id: 12006, tr: "Açık büfe", en: "Buffet", de: "Buffet", es: "Bufé libre", emoji: "🍽️" },
  { id: 12007, tr: "Kumdan kale", en: "Sandcastle", de: "Sandburg", es: "Castillo de arena", emoji: "🏰" },
  { id: 12008, tr: "Şezlong", en: "Sunbed", de: "Sonnenliege", es: "Tumbona", emoji: "🏖️" },
  { id: 12009, tr: "Harita", en: "Map", de: "Landkarte", es: "Mapa", emoji: "🗺️" },
  { id: 12010, tr: "Pasaport", en: "Passport", de: "Reisepass", es: "Pasaporte", emoji: "🛂" },
  { id: 12011, tr: "Çadır kurmak", en: "Pitching a tent", de: "Zelt aufbauen", es: "Montar la tienda", emoji: "⛺" },
  { id: 12012, tr: "Selfie çubuğu", en: "Selfie stick", de: "Selfie-Stick", es: "Palo de selfie", emoji: "🤳" },
  { id: 12013, tr: "Pisa Kulesi", en: "Leaning Tower of Pisa", de: "Schiefer Turm von Pisa", es: "Torre de Pisa", emoji: "🏛️" },
  { id: 12014, tr: "Havuza atlamak", en: "Cannonball", de: "Arschbombe", es: "Salto bomba", emoji: "🏊" },
  { id: 12015, tr: "Tren yolculuğu", en: "Train ride", de: "Zugfahrt", es: "Viaje en tren", emoji: "🚆" },
  { id: 12016, tr: "Hamak", en: "Hammock", de: "Hängematte", es: "Hamaca", emoji: "🌴" },
  { id: 12017, tr: "Şnorkel", en: "Snorkeling", de: "Schnorcheln", es: "Esnórquel", emoji: "🤿" },
  { id: 12018, tr: "Benzin bitti", en: "Out of gas", de: "Kein Benzin", es: "Sin gasolina", emoji: "⛽" },
  { id: 12019, tr: "Uçan şapka", en: "Hat blown away", de: "Weggewehter Hut", es: "Sombrero volando", emoji: "👒" },
  { id: 12020, tr: "Kayak", en: "Skiing", de: "Skifahren", es: "Esquí", emoji: "⛷️" },
  { id: 12021, tr: "Deve gezisi", en: "Camel ride", de: "Kamelritt", es: "Paseo en camello", emoji: "🐪" },
];

const FOOD_SCENES: WordEntry[] = [
  { id: 13001, tr: "Yanmış tost", en: "Burnt toast", de: "Verbrannter Toast", es: "Tostada quemada", emoji: "🍞" },
  { id: 13002, tr: "Buzdolabı baskını", en: "Fridge raid", de: "Kühlschrank plündern", es: "Asalto a la nevera", emoji: "🌙" },
  { id: 13003, tr: "Son dilim pizza", en: "Last slice of pizza", de: "Letztes Stück Pizza", es: "Último trozo de pizza", emoji: "🍕" },
  { id: 13004, tr: "Spagetti", en: "Spaghetti", de: "Spaghetti", es: "Espaguetis", emoji: "🍝" },
  { id: 13005, tr: "Acı biber", en: "Hot pepper", de: "Scharfe Chili", es: "Chile picante", emoji: "🌶️" },
  { id: 13006, tr: "Açılmayan kavanoz", en: "Stuck jar", de: "Klemmendes Glas", es: "Frasco atascado", emoji: "🫙" },
  { id: 13007, tr: "Kek yapmak", en: "Baking a cake", de: "Kuchen backen", es: "Hornear un pastel", emoji: "🧁" },
  { id: 13008, tr: "Yatakta kahvaltı", en: "Breakfast in bed", de: "Frühstück im Bett", es: "Desayuno en la cama", emoji: "🥐" },
  { id: 13009, tr: "Mangal", en: "Barbecue", de: "Grillen", es: "Barbacoa", emoji: "🍖" },
  { id: 13010, tr: "Soğan doğramak", en: "Chopping onions", de: "Zwiebeln schneiden", es: "Cortar cebolla", emoji: "🧅" },
  { id: 13011, tr: "Dondurma", en: "Ice cream", de: "Eistüte", es: "Helado", emoji: "🍦" },
  { id: 13012, tr: "Hamburger", en: "Burger", de: "Burger", es: "Hamburguesa", emoji: "🍔" },
  { id: 13013, tr: "Yemek çubukları", en: "Chopsticks", de: "Essstäbchen", es: "Palillos", emoji: "🥢" },
  { id: 13014, tr: "Çorba", en: "Soup", de: "Suppe", es: "Sopa", emoji: "🍲" },
  { id: 13015, tr: "Taşan süt", en: "Milk boiling over", de: "Überkochende Milch", es: "Leche hirviendo", emoji: "🥛" },
  { id: 13016, tr: "Dökülen kahve", en: "Spilled coffee", de: "Verschütteter Kaffee", es: "Café derramado", emoji: "🫗" },
  { id: 13017, tr: "Paket servis", en: "Food delivery", de: "Essenslieferung", es: "Comida a domicilio", emoji: "🛵" },
  { id: 13018, tr: "Kurabiye kavanozu", en: "Cookie jar", de: "Keksdose", es: "Tarro de galletas", emoji: "🍪" },
  { id: 13019, tr: "Fondü", en: "Fondue", de: "Fondue", es: "Fondue", emoji: "🫕" },
  { id: 13020, tr: "Pankek", en: "Pancakes", de: "Pfannkuchen", es: "Tortitas", emoji: "🥞" },
  { id: 13021, tr: "Karpuz", en: "Watermelon", de: "Wassermelone", es: "Sandía", emoji: "🍉" },
  { id: 13022, tr: "Kırık yumurta", en: "Broken egg", de: "Zerbrochenes Ei", es: "Huevo roto", emoji: "🥚" },
];

const PETS_SCENES: WordEntry[] = [
  { id: 14001, tr: "Klavyedeki kedi", en: "Cat on the keyboard", de: "Katze auf der Tastatur", es: "Gato en el teclado", emoji: "⌨️" },
  { id: 14002, tr: "Bardak deviren kedi", en: "Cat knocking over a glass", de: "Katze wirft Glas um", es: "Gato tirando un vaso", emoji: "🐈" },
  { id: 14003, tr: "Çorap çalan köpek", en: "Dog stealing a sock", de: "Hund klaut Socke", es: "Perro robando un calcetín", emoji: "🧦" },
  { id: 14004, tr: "Kutudaki kedi", en: "Cat in a box", de: "Katze im Karton", es: "Gato en una caja", emoji: "📦" },
  { id: 14005, tr: "Yataktaki köpek", en: "Dog in the bed", de: "Hund im Bett", es: "Perro en la cama", emoji: "🐕" },
  { id: 14006, tr: "Islak köpek", en: "Wet dog", de: "Nasser Hund", es: "Perro mojado", emoji: "💦" },
  { id: 14007, tr: "Köpek gezdirmek", en: "Dog walk", de: "Gassi gehen", es: "Pasear al perro", emoji: "🦮" },
  { id: 14008, tr: "Kedi ve lazer", en: "Cat and laser", de: "Katze und Laser", es: "Gato y láser", emoji: "🔴" },
  { id: 14009, tr: "Kostümlü köpek", en: "Dog in a costume", de: "Hund im Kostüm", es: "Perro disfrazado", emoji: "🐶" },
  { id: 14010, tr: "Hamster", en: "Hamster", de: "Hamster", es: "Hámster", emoji: "🐹" },
  { id: 14011, tr: "Ağaçtaki kedi", en: "Cat in a tree", de: "Katze im Baum", es: "Gato en el árbol", emoji: "🙀" },
  { id: 14012, tr: "Papağan", en: "Parrot", de: "Papagei", es: "Loro", emoji: "🦜" },
  { id: 14013, tr: "Akvaryum", en: "Fish tank", de: "Aquarium", es: "Pecera", emoji: "🐠" },
  { id: 14014, tr: "Havlayan köpek", en: "Barking dog", de: "Bellender Hund", es: "Perro ladrando", emoji: "🐩" },
  { id: 14015, tr: "Tırmalanan kanepe", en: "Scratched sofa", de: "Zerkratztes Sofa", es: "Sofá arañado", emoji: "🛋️" },
  { id: 14016, tr: "Kuyruk kovalamak", en: "Chasing its tail", de: "Schwanzjagd", es: "Perseguir la cola", emoji: "🌀" },
  { id: 14017, tr: "Mama kabı", en: "Food bowl", de: "Futternapf", es: "Comedero", emoji: "🥣" },
  { id: 14018, tr: "Veteriner", en: "At the vet", de: "Beim Tierarzt", es: "En el veterinario", emoji: "🩺" },
  { id: 14019, tr: "Yün yumağı", en: "Ball of yarn", de: "Wollknäuel", es: "Ovillo de lana", emoji: "🧶" },
  { id: 14020, tr: "Top getirmek", en: "Playing fetch", de: "Ball holen", es: "Traer la pelota", emoji: "🎾" },
];

const EVERYDAY_SCENES: WordEntry[] = [
  { id: 15001, tr: "Trafik", en: "Traffic jam", de: "Stau", es: "Atasco", emoji: "🚗" },
  { id: 15002, tr: "Otobüs durağı", en: "Bus stop", de: "Bushaltestelle", es: "Parada de autobús", emoji: "🚏" },
  { id: 15003, tr: "Yağmur", en: "Rain", de: "Regen", es: "Lluvia", emoji: "🌧️" },
  { id: 15004, tr: "Kırık şemsiye", en: "Broken umbrella", de: "Kaputter Schirm", es: "Paraguas roto", emoji: "☂️" },
  { id: 15005, tr: "Market arabası", en: "Shopping cart", de: "Einkaufswagen", es: "Carrito de compras", emoji: "🛒" },
  { id: 15006, tr: "Asansör", en: "Elevator", de: "Aufzug", es: "Ascensor", emoji: "🛗" },
  { id: 15007, tr: "Spor salonu", en: "Gym", de: "Fitnessstudio", es: "Gimnasio", emoji: "💪" },
  { id: 15008, tr: "Muz kabuğu", en: "Banana peel", de: "Bananenschale", es: "Cáscara de plátano", emoji: "🍌" },
  { id: 15009, tr: "Saç kesimi", en: "Haircut", de: "Haarschnitt", es: "Corte de pelo", emoji: "✂️" },
  { id: 15010, tr: "Bilgisayar", en: "Computer", de: "Rechner", es: "Ordenador", emoji: "💻" },
  { id: 15011, tr: "Park etmek", en: "Parking", de: "Einparken", es: "Aparcar", emoji: "🅿️" },
  { id: 15012, tr: "Arı", en: "Bee", de: "Biene", es: "Abeja", emoji: "🐝" },
  { id: 15013, tr: "Anahtarlar", en: "Keys", de: "Schlüssel", es: "Llaves", emoji: "🔑" },
  { id: 15014, tr: "Bisiklet", en: "Bike", de: "Fahrrad", es: "Bicicleta", emoji: "🚲" },
  { id: 15015, tr: "Yoga", en: "Yoga", de: "Yoga", es: "Yoga", emoji: "🧘" },
  { id: 15016, tr: "Kar topu", en: "Snowball fight", de: "Schneeballschlacht", es: "Guerra de nieve", emoji: "❄️" },
  { id: 15017, tr: "Kardan adam", en: "Snowman", de: "Schneemann", es: "Muñeco de nieve", emoji: "⛄" },
  { id: 15018, tr: "Su tabancası", en: "Water gun", de: "Wasserpistole", es: "Pistola de agua", emoji: "💧" },
  { id: 15019, tr: "Koşu", en: "Jogging", de: "Joggen", es: "Correr", emoji: "🏃" },
  { id: 15020, tr: "Uçurtma", en: "Kite", de: "Drachen", es: "Cometa", emoji: "🪁" },
];

const LOVE_SCENES: WordEntry[] = [
  { id: 16001, tr: "Evlenme teklifi", en: "Proposal", de: "Heiratsantrag", es: "Pedida de mano", emoji: "💍" },
  { id: 16002, tr: "Öpücük", en: "Kiss", de: "Kuss", es: "Beso", emoji: "💋" },
  { id: 16003, tr: "Aşk mektubu", en: "Love letter", de: "Liebesbrief", es: "Carta de amor", emoji: "💌" },
  { id: 16004, tr: "Gül yaprakları", en: "Rose petals", de: "Rosenblätter", es: "Pétalos de rosa", emoji: "🌹" },
  { id: 16005, tr: "Ağaçta kalp", en: "Heart on a tree", de: "Herz im Baum", es: "Corazón en el árbol", emoji: "🌳" },
  { id: 16006, tr: "Serenat", en: "Serenade", de: "Ständchen", es: "Serenata", emoji: "🎸" },
  { id: 16007, tr: "Sarılıp uyumak", en: "Cuddling in bed", de: "Kuscheln im Bett", es: "Abrazados en la cama", emoji: "🛌" },
  { id: 16008, tr: "Sarılmak", en: "Hug", de: "Umarmung", es: "Abrazo", emoji: "🫂" },
  { id: 16009, tr: "Oklu kalp", en: "Cupid's arrow", de: "Amors Pfeil", es: "Flecha de Cupido", emoji: "💘" },
  { id: 16010, tr: "Kalpli balon", en: "Heart balloon", de: "Herzballon", es: "Globo de corazón", emoji: "🎈" },
  { id: 16011, tr: "Çiçek buketi", en: "Bouquet", de: "Blumenstrauß", es: "Ramo de flores", emoji: "💐" },
  { id: 16012, tr: "Görüntülü arama", en: "Video call", de: "Videoanruf", es: "Videollamada", emoji: "📹" },
  { id: 16013, tr: "Gelinlik", en: "Wedding dress", de: "Brautkleid", es: "Vestido de novia", emoji: "👰" },
  { id: 16014, tr: "Düğün pastası", en: "Wedding cake", de: "Hochzeitstorte", es: "Pastel de boda", emoji: "💒" },
  { id: 16015, tr: "Gelin arabası", en: "Wedding car", de: "Hochzeitsauto", es: "Coche de boda", emoji: "🚙" },
  { id: 16016, tr: "Aşk kilidi", en: "Love lock", de: "Liebesschloss", es: "Candado del amor", emoji: "🔒" },
  { id: 16017, tr: "Kalpli kahve", en: "Latte heart", de: "Latte-Herz", es: "Café con corazón", emoji: "☕" },
  { id: 16018, tr: "Kırık kalp", en: "Broken heart", de: "Gebrochenes Herz", es: "Corazón roto", emoji: "💔" },
  { id: 16019, tr: "Çikolata kutusu", en: "Box of chocolates", de: "Pralinenschachtel", es: "Caja de bombones", emoji: "🍫" },
  { id: 16020, tr: "Romantik dans", en: "Slow dance", de: "Engtanz", es: "Baile lento", emoji: "💃" },
];

const SPECIAL_SCENES: WordEntry[] = [
  { id: 17001, tr: "Sürpriz parti", en: "Surprise party", de: "Überraschungsparty", es: "Fiesta sorpresa", emoji: "🎉" },
  { id: 17002, tr: "Doğum günü pastası", en: "Birthday cake", de: "Geburtstagstorte", es: "Pastel de cumpleaños", emoji: "🎂" },
  { id: 17003, tr: "Geri sayım", en: "Countdown", de: "Countdown", es: "Cuenta atrás", emoji: "⏳" },
  { id: 17004, tr: "Noel Baba", en: "Santa Claus", de: "Weihnachtsmann", es: "Papá Noel", emoji: "🎅" },
  { id: 17005, tr: "Yılbaşı ağacı", en: "Christmas tree", de: "Weihnachtsbaum", es: "Árbol de Navidad", emoji: "🎄" },
  { id: 17006, tr: "Cadılar Bayramı", en: "Halloween", de: "Halloween", es: "Halloween", emoji: "🎃" },
  { id: 17007, tr: "Sevgililer Günü", en: "Valentine's Day", de: "Valentinstag", es: "San Valentín", emoji: "💝" },
  { id: 17008, tr: "Paskalya yumurtası", en: "Easter egg", de: "Osterei", es: "Huevo de Pascua", emoji: "🐣" },
  { id: 17009, tr: "Konfeti", en: "Confetti", de: "Konfetti", es: "Confeti", emoji: "🎊" },
  { id: 17010, tr: "Hediye paketi", en: "Gift box", de: "Geschenk", es: "Regalo", emoji: "🎁" },
  { id: 17011, tr: "Parti şapkası", en: "Party hat", de: "Partyhut", es: "Gorro de fiesta", emoji: "🥳" },
  { id: 17012, tr: "Mezuniyet", en: "Graduation", de: "Abschlussfeier", es: "Graduación", emoji: "🎓" },
  { id: 17013, tr: "Havai fişek", en: "Fireworks", de: "Feuerwerk", es: "Fuegos artificiales", emoji: "🎇" },
  { id: 17014, tr: "Bebek arabası", en: "Baby stroller", de: "Kinderwagen", es: "Carrito de bebé", emoji: "👶" },
  { id: 17015, tr: "Yeni ev", en: "New home", de: "Neues Zuhause", es: "Casa nueva", emoji: "🏡" },
  { id: 17016, tr: "Yüze pasta", en: "Pie in the face", de: "Torte ins Gesicht", es: "Tarta en la cara", emoji: "🥧" },
  { id: 17017, tr: "Piyango bileti", en: "Lottery ticket", de: "Lotterielos", es: "Billete de lotería", emoji: "🎟️" },
  { id: 17018, tr: "Balonlar", en: "Balloons", de: "Luftballons", es: "Globos", emoji: "🎈" },
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
  [10001, 10018], // blanket tug-of-war, pillow fight
  [10002, 10013], // snoring partner, couch nap
  [10003, 10017], // fight over the remote, binge-watching
  [10004, 10005], // pile of dishes, laundry pile
  [10006, 10007], // toilet seat, toilet paper
  // date night
  [11001, 11005, 11006], // movie night, popcorn, horror movie
  [11002, 11019], // candlelit dinner, waiter
  // travel
  [12001, 12004], // suitcase, backpack
  [12008, 12016], // sunbed, hammock
  // kitchen
  [13001, 13008], // burnt toast, breakfast in bed
  [13015, 13016], // milk boiling over, spilled coffee
  [13006, 13018], // stuck jar, cookie jar
  // everyday
  [15003, 15004], // rain, broken umbrella
  [15016, 15017], // snowball fight, snowman
  // love
  [16005, 16009, 16010, 16017, 16018], // hearts: on a tree, cupid's arrow, balloon, latte, broken
  [16007, 16008], // cuddling in bed, hug
  [16004, 16011], // rose petals, bouquet
  [16013, 16014, 16015], // wedding dress, cake, car
  // special days
  [17003, 17013], // countdown, fireworks
  [17001, 17009, 17018], // surprise party, confetti, balloons
  [17002, 17016], // birthday cake, pie in the face
  [17004, 17005], // santa, christmas tree
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
