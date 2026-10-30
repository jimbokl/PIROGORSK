import {localOccasions,occasionHref} from './seo-occasions';
import {placesForCity,cityNames,type CitySlug} from './local-data';
import type {EditorialLink} from './editorial';
export const cityForArticle=(slug:string):CitySlug=>slug.includes('svetlogorsk')?'svetlogorsk':slug.includes('kaliningrad')?'kaliningrad':'zelenogradsk';
export const contextualLinks=(city:CitySlug):EditorialLink[]=>[
 {href:`/${city}/`,title:`Пироги: ${cityNames[city]}`,text:'Меню, предварительные цены и планы доставки для города.',label:'Ваш город'},
 {href:'/nabor/uzhin-v-apartamentah/',title:'Собрать семейный ужин',text:'500 г и 1 кг: два формата для разных вкусов.',label:'Подборка'},
 {href:'/nabor/na-kompaniyu/',title:'Стол на компанию',text:'Сытные и сладкие варианты; количество считает калькулятор.',label:'Подборка'},
 ...localOccasions.filter(p=>p.city===city&&['v-ofis-na-den-rozhdeniya','semeynyy-uzhin'].includes(p.slug)).map(p=>({href:occasionHref(p),title:p.h1,text:`Расчёт для встречи · ${cityNames[city]}.`,label:'К случаю'})),
];
export const guideFaq=[
 {question:'Можно ли сейчас заказать пироги Пирогорска?',answer:'Пока нет: проект готовится к запуску. Можно рассчитать вес и анонимно отметить интерес к подборке без контактов и оплаты.'},
 {question:'Откуда взяты адреса и цены кафе?',answer:'Адреса проверены по туристическим порталам и сайтам заведений, ссылки приведены в таблице. Цены указаны только для конкретных блюд с датой проверки. Актуальную сумму уточняйте в меню перед посещением.'},
 {question:'Как посчитать пироги на компанию?',answer:'Выберите число гостей и порцию в калькуляторе. Он округлит вес вверх до 500 г и распределит его между выбранными начинками по предварительным ценам каталога.'},
];
export const faqSchema=(faq:readonly {question:string;answer:string}[])=>({'@type':'FAQPage',mainEntity:faq.map(f=>({'@type':'Question',name:f.question,acceptedAnswer:{'@type':'Answer',text:f.answer}}))});
export const placesSchema=(city:CitySlug)=>({'@type':'ItemList',name:`Адресный справочник: ${cityNames[city]}`,itemListElement:placesForCity(city).map((p,i)=>({'@type':'ListItem',position:i+1,item:{'@type':'Place',name:p.name,address:p.address,url:p.sources[0].url}}))});
