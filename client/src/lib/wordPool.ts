/**
 * Word pool: short, funny scenes from life as a couple ("Blanket tug-of-war", "Lost luggage",
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
  { id: 10004, tr: "Bulaşık dağı", en: "Mountain of dishes", de: "Geschirrberg", es: "Montaña de platos", emoji: "🫧" },
  { id: 10005, tr: "Çamaşır dağı", en: "Laundry mountain", de: "Wäscheberg", es: "Montaña de ropa", emoji: "👕" },
  { id: 10006, tr: "Kalkık klozet kapağı", en: "Toilet seat left up", de: "Hochgeklappte Klobrille", es: "Tapa del váter levantada", emoji: "🚽" },
  { id: 10007, tr: "Biten tuvalet kağıdı", en: "Empty toilet roll", de: "Leere Klopapierrolle", es: "Rollo de papel vacío", emoji: "🧻" },
  { id: 10008, tr: "Mobilya kurmak", en: "Assembling furniture", de: "Möbel aufbauen", es: "Montar muebles", emoji: "🪛" },
  { id: 10009, tr: "Örümcekten kaçmak", en: "Running from a spider", de: "Flucht vor der Spinne", es: "Huir de una araña", emoji: "🕷️" },
  { id: 10010, tr: "Duşta şarkı söylemek", en: "Singing in the shower", de: "Singen unter der Dusche", es: "Cantar en la ducha", emoji: "🚿" },
  { id: 10011, tr: "Dağınık sabah saçı", en: "Bed hair", de: "Morgenfrisur", es: "Pelo de recién levantado", emoji: "💇" },
  { id: 10012, tr: "Alarmı ertelemek", en: "Hitting snooze", de: "Schlummertaste drücken", es: "Posponer la alarma", emoji: "⏰" },
  { id: 10013, tr: "Kanepede uyuyakalmak", en: "Asleep on the couch", de: "Auf dem Sofa eingeschlafen", es: "Dormido en el sofá", emoji: "💤" },
  { id: 10014, tr: "Battaniye burritosu", en: "Blanket burrito", de: "Decken-Burrito", es: "Burrito de manta", emoji: "🌯" },
  { id: 10015, tr: "Şarj yüzde bir", en: "Phone at 1%", de: "Handy auf 1 %", es: "Móvil al 1 %", emoji: "🪫" },
  { id: 10016, tr: "İnternet gitti", en: "Wi-Fi is down", de: "WLAN ist weg", es: "Se cayó el wifi", emoji: "📶" },
  { id: 10017, tr: "Dizi maratonu", en: "Binge-watching", de: "Serienmarathon", es: "Maratón de series", emoji: "🍿" },
  { id: 10018, tr: "Yastık savaşı", en: "Pillow fight", de: "Kissenschlacht", es: "Guerra de almohadas", emoji: "🪶" },
  { id: 10019, tr: "Evde spor", en: "Home workout", de: "Training zu Hause", es: "Ejercicio en casa", emoji: "🏋️" },
  { id: 10020, tr: "Kapıda kalmak", en: "Locked out", de: "Ausgesperrt", es: "Quedarse fuera", emoji: "🚪" },
  { id: 10021, tr: "Kuruyan saksı çiçeği", en: "Dead houseplant", de: "Vertrocknete Pflanze", es: "Planta marchita", emoji: "🥀" },
  { id: 10022, tr: "Pijama günü", en: "Pajama day", de: "Pyjamatag", es: "Día de pijama", emoji: "🛌" },
];

const DATE_SCENES: WordEntry[] = [
  { id: 11001, tr: "Dişte ıspanak", en: "Spinach in teeth", de: "Spinat zwischen den Zähnen", es: "Espinaca en los dientes", emoji: "🥬" },
  { id: 11002, tr: "Mumlu akşam yemeği", en: "Candlelit dinner", de: "Candlelight-Dinner", es: "Cena con velas", emoji: "🕯️" },
  { id: 11003, tr: "Hesabı bölüşmek", en: "Splitting the bill", de: "Rechnung teilen", es: "Pagar a medias", emoji: "🧾" },
  { id: 11004, tr: "Üstüne çorba dökmek", en: "Soup on your shirt", de: "Suppe aufs Hemd", es: "Sopa en la camisa", emoji: "🍲" },
  { id: 11005, tr: "Sinemada mısır dökmek", en: "Spilled popcorn", de: "Verschüttetes Popcorn", es: "Palomitas derramadas", emoji: "🎬" },
  { id: 11006, tr: "Korku filminde sarılmak", en: "Scared at a horror film", de: "Angst im Horrorfilm", es: "Miedo en una peli de terror", emoji: "👻" },
  { id: 11007, tr: "İki pipetli milkshake", en: "Milkshake with two straws", de: "Milchshake mit zwei Strohhalmen", es: "Batido con dos pajitas", emoji: "🥤" },
  { id: 11008, tr: "Kör randevu", en: "Blind date", de: "Blind Date", es: "Cita a ciegas", emoji: "🙈" },
  { id: 11009, tr: "Gün batımında yürüyüş", en: "Sunset walk", de: "Spaziergang im Sonnenuntergang", es: "Paseo al atardecer", emoji: "🌅" },
  { id: 11010, tr: "Piknik randevusu", en: "Picnic date", de: "Picknick zu zweit", es: "Pícnic en pareja", emoji: "🧺" },
  { id: 11011, tr: "Bowlingde oluk topu", en: "Gutter ball", de: "Rinnenwurf beim Bowling", es: "Bola a la canaleta", emoji: "🎳" },
  { id: 11012, tr: "Karaoke düeti", en: "Karaoke duet", de: "Karaoke-Duett", es: "Dueto de karaoke", emoji: "🎤" },
  { id: 11013, tr: "Dev oyuncak ayı kazanmak", en: "Winning a giant teddy", de: "Riesenteddy gewinnen", es: "Ganar un peluche gigante", emoji: "🧸" },
  { id: 11014, tr: "Buz pateninde düşmek", en: "Falling on the ice rink", de: "Sturz auf der Eisbahn", es: "Caída en la pista de hielo", emoji: "⛸️" },
  { id: 11015, tr: "Dönme dolapta öpücük", en: "Kiss on the Ferris wheel", de: "Kuss im Riesenrad", es: "Beso en la noria", emoji: "🎡" },
  { id: 11016, tr: "İki kişi tek şemsiye", en: "Sharing an umbrella", de: "Ein Schirm für zwei", es: "Un paraguas para dos", emoji: "🌂" },
  { id: 11017, tr: "Geç kalan sevgili", en: "Partner running late", de: "Partner kommt zu spät", es: "Pareja que llega tarde", emoji: "⌚" },
  { id: 11018, tr: "Telefona gömülmüş sevgili", en: "Partner glued to the phone", de: "Partner klebt am Handy", es: "Pareja pegada al móvil", emoji: "📱" },
  { id: 11019, tr: "Kombin kıyafetler", en: "Matching outfits", de: "Partnerlook", es: "Ropa a juego", emoji: "👫" },
  { id: 11020, tr: "Tandem bisiklet", en: "Tandem bike", de: "Tandem fahren", es: "Bicicleta tándem", emoji: "🚴" },
  { id: 11021, tr: "Fotoğraf kabini", en: "Photo booth", de: "Fotoautomat", es: "Fotomatón", emoji: "📸" },
];

const TRAVEL_SCENES: WordEntry[] = [
  { id: 12001, tr: "Kaybolan valiz", en: "Lost luggage", de: "Verlorener Koffer", es: "Maleta perdida", emoji: "🧳" },
  { id: 12002, tr: "Güneş yanığı", en: "Sunburn", de: "Sonnenbrand", es: "Quemadura solar", emoji: "🥵" },
  { id: 12003, tr: "Kaçan uçak", en: "Missed flight", de: "Flug verpasst", es: "Vuelo perdido", emoji: "✈️" },
  { id: 12004, tr: "Kapanmayan valiz", en: "Overstuffed suitcase", de: "Überfüllter Koffer", es: "Maleta a reventar", emoji: "🎒" },
  { id: 12005, tr: "Gemide deniz tutması", en: "Seasick on a cruise", de: "Seekrank auf dem Schiff", es: "Mareo en el crucero", emoji: "🚢" },
  { id: 12006, tr: "Açık büfe tabak kulesi", en: "Buffet plate tower", de: "Überladener Buffetteller", es: "Plato hasta arriba en el bufé", emoji: "🍽️" },
  { id: 12007, tr: "Kumdan kale", en: "Sandcastle", de: "Sandburg", es: "Castillo de arena", emoji: "🏰" },
  { id: 12008, tr: "Şezlonga havlu koymak", en: "Towel on a sunbed", de: "Handtuch auf der Liege", es: "Toalla en la tumbona", emoji: "🏖️" },
  { id: 12009, tr: "Haritayla kaybolmak", en: "Lost with a map", de: "Verirrt mit Karte", es: "Perdidos con un mapa", emoji: "🗺️" },
  { id: 12010, tr: "Unutulan pasaport", en: "Forgotten passport", de: "Pass vergessen", es: "Pasaporte olvidado", emoji: "🛂" },
  { id: 12011, tr: "Kurulamayan çadır", en: "Tent that won't go up", de: "Zelt, das nicht steht", es: "Tienda que no se monta", emoji: "⛺" },
  { id: 12012, tr: "Selfie çubuğu", en: "Selfie stick", de: "Selfiestick", es: "Palo selfie", emoji: "🤳" },
  { id: 12013, tr: "Pisa Kulesini tutmak", en: "Holding up Pisa", de: "Pisa stützen", es: "Sujetar la torre de Pisa", emoji: "🏛️" },
  { id: 12014, tr: "Havuza bomba atlayış", en: "Cannonball into the pool", de: "Bombensprung in den Pool", es: "Bomba en la piscina", emoji: "🏊" },
  { id: 12015, tr: "Uçakta uyuyakalmak", en: "Asleep on the plane", de: "Eingeschlafen im Flugzeug", es: "Dormido en el avión", emoji: "💺" },
  { id: 12016, tr: "Hamakta şekerleme", en: "Napping in a hammock", de: "Nickerchen in der Hängematte", es: "Siesta en la hamaca", emoji: "🌴" },
  { id: 12017, tr: "Şnorkelle dalış", en: "Snorkeling", de: "Schnorcheln", es: "Buceo con tubo", emoji: "🤿" },
  { id: 12018, tr: "Yolda benzin bitti", en: "Out of gas", de: "Benzin leer", es: "Sin gasolina", emoji: "⛽" },
  { id: 12019, tr: "Rüzgarda uçan şapka", en: "Hat blown away", de: "Hut weggeweht", es: "Sombrero volando", emoji: "👒" },
  { id: 12020, tr: "Kayakta düşmek", en: "Ski crash", de: "Skisturz", es: "Caída esquiando", emoji: "⛷️" },
  { id: 12021, tr: "Hediyelik eşya avı", en: "Souvenir shopping", de: "Souvenirs kaufen", es: "Compras de recuerdos", emoji: "🛍️" },
];

const FOOD_SCENES: WordEntry[] = [
  { id: 13001, tr: "Yanmış kahvaltı", en: "Burnt breakfast", de: "Verbranntes Frühstück", es: "Desayuno quemado", emoji: "🍳" },
  { id: 13002, tr: "Gece buzdolabı baskını", en: "Midnight fridge raid", de: "Kühlschrank um Mitternacht", es: "Asalto nocturno a la nevera", emoji: "🌙" },
  { id: 13003, tr: "Son pizza dilimi", en: "Last slice of pizza", de: "Das letzte Stück Pizza", es: "El último trozo de pizza", emoji: "🍕" },
  { id: 13004, tr: "Spagetti öpücüğü", en: "Spaghetti kiss", de: "Spaghetti-Kuss", es: "Beso de espagueti", emoji: "🍝" },
  { id: 13005, tr: "Çok acı biber", en: "Way-too-hot chili", de: "Viel zu scharfe Chili", es: "Chile demasiado picante", emoji: "🌶️" },
  { id: 13006, tr: "Diyet ama pasta", en: "Diet vs. cake", de: "Diät gegen Torte", es: "Dieta contra pastel", emoji: "🍰" },
  { id: 13007, tr: "Çöken kek", en: "Collapsed cake", de: "Eingefallener Kuchen", es: "Pastel hundido", emoji: "🧁" },
  { id: 13008, tr: "Yatakta kahvaltı", en: "Breakfast in bed", de: "Frühstück im Bett", es: "Desayuno en la cama", emoji: "🥐" },
  { id: 13009, tr: "Yanmayan mangal", en: "BBQ that won't light", de: "Grill, der nicht angeht", es: "Barbacoa que no prende", emoji: "🍖" },
  { id: 13010, tr: "Soğan doğrarken ağlamak", en: "Crying over onions", de: "Weinen beim Zwiebelschneiden", es: "Llorar cortando cebolla", emoji: "🧅" },
  { id: 13011, tr: "Yere düşen dondurma", en: "Dropped ice cream", de: "Heruntergefallenes Eis", es: "Helado al suelo", emoji: "🍦" },
  { id: 13012, tr: "Dev hamburger", en: "Giant burger", de: "Riesenburger", es: "Hamburguesa gigante", emoji: "🍔" },
  { id: 13013, tr: "Çubukla yemek savaşı", en: "Chopstick struggle", de: "Kampf mit Stäbchen", es: "Lucha con los palillos", emoji: "🥢" },
  { id: 13014, tr: "Patlayan mikrodalga", en: "Exploding microwave", de: "Explodierende Mikrowelle", es: "Microondas que explota", emoji: "💥" },
  { id: 13015, tr: "Taşan süt", en: "Milk boiling over", de: "Übergekochte Milch", es: "Leche que se sale", emoji: "🥛" },
  { id: 13016, tr: "Dökülen kahve", en: "Spilled coffee", de: "Verschütteter Kaffee", es: "Café derramado", emoji: "🫗" },
  { id: 13017, tr: "Kapıdaki kurye", en: "Food delivery", de: "Essenslieferung", es: "Comida a domicilio", emoji: "🛵" },
  { id: 13018, tr: "Kurabiye kavanozunda el", en: "Hand in the cookie jar", de: "Hand in der Keksdose", es: "Mano en el bote de galletas", emoji: "🍪" },
  { id: 13019, tr: "Peynir fondü", en: "Cheese fondue", de: "Käsefondue", es: "Fondue de queso", emoji: "🫕" },
  { id: 13020, tr: "Havada pankek", en: "Pancake flip", de: "Pfannkuchen wenden", es: "Voltear tortitas", emoji: "🥞" },
  { id: 13021, tr: "Karpuz çekirdeği tükürmek", en: "Watermelon seed spitting", de: "Melonenkerne spucken", es: "Escupir pepitas de sandía", emoji: "🍉" },
  { id: 13022, tr: "Yere düşen yumurta", en: "Egg on the floor", de: "Ei auf dem Boden", es: "Huevo en el suelo", emoji: "🥚" },
];

const PETS_SCENES: WordEntry[] = [
  { id: 14001, tr: "Klavyedeki kedi", en: "Cat on the keyboard", de: "Katze auf der Tastatur", es: "Gato en el teclado", emoji: "⌨️" },
  { id: 14002, tr: "Bardak deviren kedi", en: "Cat knocking over a glass", de: "Katze wirft Glas um", es: "Gato tirando un vaso", emoji: "🐈" },
  { id: 14003, tr: "Çorap çalan köpek", en: "Dog stealing a sock", de: "Hund klaut Socke", es: "Perro robando un calcetín", emoji: "🧦" },
  { id: 14004, tr: "Kutudaki kedi", en: "Cat in a box", de: "Katze im Karton", es: "Gato en una caja", emoji: "📦" },
  { id: 14005, tr: "Yatağı kaplayan köpek", en: "Dog hogging the bed", de: "Hund belegt das Bett", es: "Perro ocupando la cama", emoji: "🐕" },
  { id: 14006, tr: "Silkelenen ıslak köpek", en: "Wet dog shaking off", de: "Nasser Hund schüttelt sich", es: "Perro mojado sacudiéndose", emoji: "💦" },
  { id: 14007, tr: "Sahibini sürükleyen köpek", en: "Dog dragging its owner", de: "Hund zieht Herrchen", es: "Perro arrastrando al dueño", emoji: "🦮" },
  { id: 14008, tr: "Lazer kovalayan kedi", en: "Cat chasing a laser", de: "Katze jagt Laserpunkt", es: "Gato persiguiendo un láser", emoji: "🔴" },
  { id: 14009, tr: "Kostümlü köpek", en: "Dog in a costume", de: "Hund im Kostüm", es: "Perro disfrazado", emoji: "🐶" },
  { id: 14010, tr: "Kaçan hamster", en: "Escaped hamster", de: "Ausgebüxter Hamster", es: "Hámster fugado", emoji: "🐹" },
  { id: 14011, tr: "Ağaçta mahsur kedi", en: "Cat stuck in a tree", de: "Katze im Baum", es: "Gato atrapado en un árbol", emoji: "🙀" },
  { id: 14012, tr: "Konuşan papağan", en: "Talking parrot", de: "Sprechender Papagei", es: "Loro que habla", emoji: "🦜" },
  { id: 14013, tr: "Akvaryumu izleyen kedi", en: "Cat watching the fish tank", de: "Katze vorm Aquarium", es: "Gato mirando la pecera", emoji: "🐠" },
  { id: 14014, tr: "Postacıya havlayan köpek", en: "Dog barking at the mailman", de: "Hund bellt den Postboten an", es: "Perro ladrando al cartero", emoji: "📬" },
  { id: 14015, tr: "Kanepeyi tırmalayan kedi", en: "Cat scratching the sofa", de: "Katze kratzt am Sofa", es: "Gato arañando el sofá", emoji: "🛋️" },
  { id: 14016, tr: "Kuyruğunu kovalayan köpek", en: "Dog chasing its tail", de: "Hund jagt seinen Schwanz", es: "Perro persiguiendo su cola", emoji: "🌀" },
  { id: 14017, tr: "Boş mama kabı", en: "Empty food bowl", de: "Leerer Napf", es: "Cuenco vacío", emoji: "🥣" },
  { id: 14018, tr: "Veterinerde korkan köpek", en: "Scared at the vet", de: "Angst beim Tierarzt", es: "Miedo al veterinario", emoji: "🩺" },
  { id: 14019, tr: "Yumakla oynayan kedi", en: "Cat with a ball of yarn", de: "Katze mit Wollknäuel", es: "Gato con un ovillo", emoji: "🧶" },
  { id: 14020, tr: "Top getiren köpek", en: "Dog playing fetch", de: "Hund apportiert", es: "Perro buscando la pelota", emoji: "🎾" },
];

const EVERYDAY_SCENES: WordEntry[] = [
  { id: 15001, tr: "Trafikte sıkışmak", en: "Stuck in traffic", de: "Im Stau stehen", es: "Atrapado en un atasco", emoji: "🚗" },
  { id: 15002, tr: "Otobüsü kaçırmak", en: "Missing the bus", de: "Bus verpasst", es: "Perder el autobús", emoji: "🚌" },
  { id: 15003, tr: "Yağmura yakalanmak", en: "Caught in the rain", de: "Vom Regen überrascht", es: "Pillado por la lluvia", emoji: "🌧️" },
  { id: 15004, tr: "Ters dönen şemsiye", en: "Umbrella blown inside out", de: "Umgestülpter Schirm", es: "Paraguas dado la vuelta", emoji: "☂️" },
  { id: 15005, tr: "Market arabası yarışı", en: "Shopping cart race", de: "Einkaufswagenrennen", es: "Carrera de carritos", emoji: "🛒" },
  { id: 15006, tr: "Asansörde mahsur kalmak", en: "Stuck in the elevator", de: "Im Aufzug stecken", es: "Atrapado en el ascensor", emoji: "🛗" },
  { id: 15007, tr: "Spor salonunda ilk gün", en: "First day at the gym", de: "Erster Tag im Fitnessstudio", es: "Primer día en el gimnasio", emoji: "💪" },
  { id: 15008, tr: "Muz kabuğunda kaymak", en: "Slipping on a banana peel", de: "Auf Bananenschale ausrutschen", es: "Resbalar con una cáscara de plátano", emoji: "🍌" },
  { id: 15009, tr: "Berbat saç kesimi", en: "Bad haircut", de: "Missglückter Haarschnitt", es: "Corte de pelo horrible", emoji: "✂️" },
  { id: 15010, tr: "Toplantıda uyuklamak", en: "Dozing off in a meeting", de: "Im Meeting einnicken", es: "Dormirse en una reunión", emoji: "💼" },
  { id: 15011, tr: "Park edememek", en: "Failed parallel parking", de: "Einparken misslingt", es: "Aparcar fatal", emoji: "🅿️" },
  { id: 15012, tr: "Arıdan kaçmak", en: "Chased by a bee", de: "Von einer Biene verfolgt", es: "Perseguido por una abeja", emoji: "🐝" },
  { id: 15013, tr: "Kayıp anahtarlar", en: "Lost keys", de: "Schlüssel verloren", es: "Llaves perdidas", emoji: "🔑" },
  { id: 15014, tr: "Bisikletten düşmek", en: "Falling off a bike", de: "Vom Fahrrad fallen", es: "Caerse de la bici", emoji: "🚲" },
  { id: 15015, tr: "Yoga pozunda takılmak", en: "Stuck in a yoga pose", de: "In der Yogapose festhängen", es: "Atascado en una postura de yoga", emoji: "🧘" },
  { id: 15016, tr: "Kar topu savaşı", en: "Snowball fight", de: "Schneeballschlacht", es: "Guerra de bolas de nieve", emoji: "❄️" },
  { id: 15017, tr: "Kardan adam yapmak", en: "Building a snowman", de: "Schneemann bauen", es: "Hacer un muñeco de nieve", emoji: "⛄" },
  { id: 15018, tr: "Su savaşı", en: "Water fight", de: "Wasserschlacht", es: "Guerra de agua", emoji: "💧" },
  { id: 15019, tr: "Sabah koşusu", en: "Morning jog", de: "Morgenjogging", es: "Correr por la mañana", emoji: "🏃" },
  { id: 15020, tr: "Ağaca takılan uçurtma", en: "Kite stuck in a tree", de: "Drachen im Baum", es: "Cometa atrapada en un árbol", emoji: "🪁" },
];

const LOVE_SCENES: WordEntry[] = [
  { id: 16001, tr: "Diz çöküp evlenme teklifi", en: "Proposal on one knee", de: "Heiratsantrag auf Knien", es: "Pedida de mano de rodillas", emoji: "💍" },
  { id: 16002, tr: "İlk öpücük", en: "First kiss", de: "Erster Kuss", es: "Primer beso", emoji: "💋" },
  { id: 16003, tr: "Aşk mektubu", en: "Love letter", de: "Liebesbrief", es: "Carta de amor", emoji: "💌" },
  { id: 16004, tr: "Yatakta gül yaprakları", en: "Rose petals on the bed", de: "Rosenblätter auf dem Bett", es: "Pétalos de rosa en la cama", emoji: "🌹" },
  { id: 16005, tr: "Ağaca kazınmış kalp", en: "Heart carved in a tree", de: "Herz in den Baum geritzt", es: "Corazón grabado en un árbol", emoji: "🌳" },
  { id: 16006, tr: "Balkon altında serenat", en: "Serenade under the balcony", de: "Ständchen unterm Balkon", es: "Serenata bajo el balcón", emoji: "🎸" },
  { id: 16007, tr: "Kaşık pozisyonunda uyumak", en: "Spooning", de: "Löffelchenstellung", es: "Dormir de cucharita", emoji: "🥄" },
  { id: 16008, tr: "Ayı gibi sarılmak", en: "Bear hug", de: "Bärenumarmung", es: "Abrazo de oso", emoji: "🫂" },
  { id: 16009, tr: "Kıskanç sevgili", en: "Jealous partner", de: "Eifersüchtiger Partner", es: "Pareja celosa", emoji: "😒" },
  { id: 16010, tr: "Küs sevgililer", en: "Silent treatment", de: "Schweigen nach dem Streit", es: "La ley del hielo", emoji: "🤐" },
  { id: 16011, tr: "Özür çiçekleri", en: "Sorry flowers", de: "Blumen zur Entschuldigung", es: "Flores de disculpa", emoji: "💐" },
  { id: 16012, tr: "Uzaktan görüntülü arama", en: "Long-distance video call", de: "Videoanruf in der Fernbeziehung", es: "Videollamada a distancia", emoji: "💻" },
  { id: 16013, tr: "Gelin buketini yakalamak", en: "Catching the bouquet", de: "Brautstrauß fangen", es: "Atrapar el ramo", emoji: "👰" },
  { id: 16014, tr: "Devrilen düğün pastası", en: "Toppling wedding cake", de: "Umkippende Hochzeitstorte", es: "Tarta de boda cayéndose", emoji: "💒" },
  { id: 16015, tr: "Balayı", en: "Honeymoon", de: "Flitterwochen", es: "Luna de miel", emoji: "🏝️" },
  { id: 16016, tr: "Köprüde aşk kilidi", en: "Love lock on a bridge", de: "Liebesschloss an der Brücke", es: "Candado del amor en un puente", emoji: "🔒" },
  { id: 16017, tr: "Kahvede kalp köpüğü", en: "Latte art heart", de: "Latte-Art-Herz", es: "Corazón en el café", emoji: "☕" },
  { id: 16018, tr: "Kırık kalp", en: "Broken heart", de: "Gebrochenes Herz", es: "Corazón roto", emoji: "💔" },
  { id: 16019, tr: "Unutulan yıldönümü", en: "Forgotten anniversary", de: "Vergessener Jahrestag", es: "Aniversario olvidado", emoji: "📅" },
  { id: 16020, tr: "Romantik dans", en: "Slow dance", de: "Langsamer Tanz", es: "Baile lento", emoji: "💃" },
];

const SPECIAL_SCENES: WordEntry[] = [
  { id: 17001, tr: "Sürpriz parti", en: "Surprise party", de: "Überraschungsparty", es: "Fiesta sorpresa", emoji: "🎉" },
  { id: 17002, tr: "Mumları üflemek", en: "Blowing out the candles", de: "Kerzen auspusten", es: "Soplar las velas", emoji: "🎂" },
  { id: 17003, tr: "Yılbaşı geri sayımı", en: "New Year's countdown", de: "Silvester-Countdown", es: "Cuenta atrás de Año Nuevo", emoji: "🎆" },
  { id: 17004, tr: "Çirkin kazak hediyesi", en: "Ugly sweater gift", de: "Hässlicher Weihnachtspulli", es: "Jersey feo de regalo", emoji: "🧥" },
  { id: 17005, tr: "Ağaç süslemek", en: "Decorating the tree", de: "Baum schmücken", es: "Decorar el árbol", emoji: "🎄" },
  { id: 17006, tr: "Cadılar Bayramı kostümü", en: "Halloween costume", de: "Halloweenkostüm", es: "Disfraz de Halloween", emoji: "🎃" },
  { id: 17007, tr: "Sevgililer Günü kartı", en: "Valentine's card", de: "Valentinskarte", es: "Tarjeta de San Valentín", emoji: "💝" },
  { id: 17008, tr: "Paskalya yumurtası avı", en: "Easter egg hunt", de: "Ostereiersuche", es: "Búsqueda de huevos de Pascua", emoji: "🐣" },
  { id: 17009, tr: "Konfeti patlatmak", en: "Confetti cannon", de: "Konfettikanone", es: "Cañón de confeti", emoji: "🎊" },
  { id: 17010, tr: "Açılmayan hediye", en: "Gift that won't open", de: "Geschenk, das nicht aufgeht", es: "Regalo que no se abre", emoji: "🎁" },
  { id: 17011, tr: "Düğünde ilk dans", en: "First dance", de: "Hochzeitstanz", es: "Primer baile", emoji: "🕺" },
  { id: 17012, tr: "Kep fırlatmak", en: "Graduation cap toss", de: "Hutwurf zum Abschluss", es: "Lanzar el birrete", emoji: "🎓" },
  { id: 17013, tr: "Havai fişek gösterisi", en: "Fireworks", de: "Feuerwerk", es: "Fuegos artificiales", emoji: "🎇" },
  { id: 17014, tr: "Bebek müjdesi", en: "Baby announcement", de: "Babyankündigung", es: "Anuncio de bebé", emoji: "👶" },
  { id: 17015, tr: "Yeni ev partisi", en: "Housewarming party", de: "Einweihungsparty", es: "Fiesta de inauguración", emoji: "🏡" },
  { id: 17016, tr: "Yüze pasta", en: "Cake in the face", de: "Torte ins Gesicht", es: "Tarta en la cara", emoji: "🥧" },
  { id: 17017, tr: "Kazanan piyango bileti", en: "Winning lottery ticket", de: "Lottogewinn", es: "Billete premiado", emoji: "🎟️" },
  { id: 17018, tr: "Balon patlatmak", en: "Popping balloons", de: "Luftballons platzen lassen", es: "Explotar globos", emoji: "🎈" },
  { id: 17019, tr: "Kamp ateşinde marshmallow", en: "Marshmallows by the campfire", de: "Marshmallows am Lagerfeuer", es: "Nubes en la hoguera", emoji: "🔥" },
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
  [10001, 10014], // blanket tug-of-war, blanket burrito
  [10002, 10013], // snoring partner, asleep on the couch
  [10003, 10017], // fight over the remote, binge-watching
  [10004, 10005], // mountain of dishes, laundry mountain
  [10006, 10007], // toilet seat, toilet roll
  // date night
  [11005, 11006], // popcorn at the cinema, horror film
  // travel
  [12001, 12004], // lost luggage, overstuffed suitcase
  [12003, 12015], // missed flight, asleep on the plane
  [12008, 12016], // towel on a sunbed, hammock
  // kitchen
  [13011, 13022], // dropped ice cream, egg on the floor
  [13015, 13016], // milk boiling over, spilled coffee
  [13006, 13007], // diet vs. cake, collapsed cake
  // everyday
  [15003, 15004], // caught in the rain, umbrella inside out
  [15016, 15017], // snowball fight, snowman
  // love
  [16005, 16017, 16018], // hearts: carved, latte, broken
  [16007, 16008], // spooning, bear hug
  [16013, 16014], // bouquet, wedding cake
  // special days
  [17003, 17013], // new year's countdown, fireworks
  [17001, 17009, 17018], // surprise party, confetti, balloons
  [17002, 17016], // blowing out candles, cake in the face
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

/** Wrong-but-plausible answers from the word's own theme, for the drawer's guess buttons. */
export function getDistractors(word: string, category: WordCategory | string, locale: Locale, count = 3): string[] {
  const entry = entryOf(word);
  const banned = entry ? lookAlikeIds(entry.id) : new Set<number>();
  const pool = (themeOf(word) || wordsOf(category)).filter((candidate) => !banned.has(candidate.id)).map((candidate) => localized(candidate, locale));
  const others = pool.filter((value) => value.toLocaleLowerCase("tr") !== word.toLocaleLowerCase("tr"));
  for (let i = others.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  return others.slice(0, count);
}
