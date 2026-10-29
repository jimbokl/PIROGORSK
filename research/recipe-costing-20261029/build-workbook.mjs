import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const dir = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(dir, '../../outputs/01a16a37-1bd2-7913-9c7b-ecd36e870428');
const facts = JSON.parse(await fs.readFile(path.join(dir, 'recipe-source-facts.json'), 'utf8'));
const audit = {
 K01:'Ложки, стаканы, штуки; диапазон сыра; нет массы дрожжей и выхода.',
 K02:'Ложки и штуки; у масла, зелени и перца нет количества; выход не подтверждён.',
 K03:'Брутто смешивает граммы, стаканы и штуки; выход не подтверждён.',
 K04:'Закладки в граммах; сверить дозу дрожжей в описании, замерить выход.',
 K05:'Яйцо 3 и желток 4 под заголовком «г»; вода упомянута без закладки. Спорно.',
 Q01:'Нет выхода; вода есть в описании без количества; закладку феты сверить.',
 Q02:'Яйца, желтки и половина лайма под заголовком «г»; единицы требуют сверки.',
 Q03:'Специи «по вкусу»; выход не подтверждён.',
 Q04:'Перец 100 г, в составе килька; вода без количества. Не использовать до проверки.',
 Q05:'Смешаны граммы, штуки, ложки и щепотки; нет точной дозы соли и выхода.',
 Q06:'Диапазон масла, штуки под заголовком «г», специи без граммовок.',
 Q07:'Закладки в граммах; нужен фактический выход пробной партии.'
};
const wb = Workbook.create();
const main = wb.worksheets.add('Сравнение');
const feta = wb.worksheets.add('Киш фета');
const potato = wb.worksheets.add('Картофыджын');
const sources = wb.worksheets.add('Подборка');
const C={ink:'#243C3A',green:'#365D51',paper:'#F8F6F0',amber:'#FFF0C8',blue:'#1257A5',line:'#D7DED8',red:'#AD3232'};
const money='#,##0.00;(#,##0.00);"—"';
const percent='0.0%;(0.0%);"—"';
function put(s,a,v){s.getRange(a).values=[[v]];}
function formula(s,a,v){s.getRange(a).formulas=[[v]];}
function base(s,range='A1:G36'){
 s.showGridLines=false;s.getRange(range).format.font={name:'Arial',size:10,color:C.ink};
 s.getRange(range).format.rowHeight=23;s.getRange(range).format.verticalAlignment='center';
 s.getRange('A2').format.font={name:'Arial',size:14,bold:true,color:C.ink};
 s.getRange('A3').format.font={name:'Arial',size:10,italic:true,color:'#64746D'};
}
function header(s,range){s.getRange(range).format={fill:C.ink,font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},horizontalAlignment:'center',verticalAlignment:'center',wrapText:true};s.getRange(range).format.rowHeight=34;}
function input(s,range){s.getRange(range).format.fill=C.amber;s.getRange(range).format.font.color=C.blue;}
function nonnegative(s,range){s.dataValidations.add({range,rule:{type:'decimal',operator:'greaterThanOrEqual',formula1:0}});}

function recipe(sheet,id){
 const fact=facts.find(x=>x.id===id);base(sheet);
 ['A:A','B:B','C:C','D:D','E:E','F:F','G:G'].forEach((x,i)=>sheet.getRange(x).format.columnWidth=[30,18,18,16,17,17,31][i]);
 put(sheet,'A2',fact.name);put(sheet,'A3',`${id} · ${id==='Q01'?'исходные закладки в граммах · ':''}источник и замечания — в «Подборке»`);
 put(sheet,'A4','Жёлтые поля: закупочная масса в граммах и цена за кг из накладной.');
 sheet.getRange('A6:G6').values=[['Ингредиент','Брутто источника','Нетто источника','В закупку, г','Цена за кг, ₽','Сумма, ₽','Основание цены / правки']];header(sheet,'A6:G6');
 const rows=fact.ingredient_tables[0].slice(1).map(r=>[r[0],r[1],r[2],null,null,null,null]);
 if(id==='Q01'){
  rows.forEach(r=>r[3]=Number(r[1]));
  rows.push(['Вода — сверить рецептуру','Не указано','Не указано',null,null,null,'Если не нужна, явно введите 0 г']);
 } else {
  rows.find(r=>r[0]==='Картофель')[3]=1000;
  rows.find(r=>r[0]==='Масло сливочное')[3]=50;
  rows.push(['Дрожжи — уточнить вид и дозу','Не указано','Не указано',null,null,null,'Есть в описании, нет в закладке']);
 }
 while(rows.length<16)rows.push([null,null,null,null,null,null,null]);
 sheet.getRange('A7:G22').values=rows;input(sheet,'D7:E22');input(sheet,'G7:G22');
 sheet.getRange('A7:C22').format.wrapText=true;sheet.getRange('A7:G22').format.rowHeight=35;
 sheet.getRange('D7:F32').setNumberFormat(money);nonnegative(sheet,'D7:E22');
 for(let r=7;r<=22;r++)formula(sheet,`F${r}`,`=IF(A${r}="","",IF(NOT(ISNUMBER(D${r})),"",IF(D${r}<0,"",IF(D${r}=0,0,IF(AND(ISNUMBER(E${r}),E${r}>=0),D${r}/1000*E${r},"")))))`);
 const controls=[['Сумма закладок, г'],['Сырьё на партию, ₽'],['Рецептура проверена'],['Изделий в партии, шт.'],['Выход выпечки партии, г'],['Статус расчёта'],['Сырьё на изделие, ₽'],['Масса изделия, г']];
 sheet.getRange('A25:A32').values=controls;
 formula(sheet,'B25','=IF(COUNT(D7:D22)=COUNTA(A7:A22),SUM(D7:D22),"")');
 formula(sheet,'B26','=IF(COUNT(F7:F22)=COUNTA(A7:A22),SUM(F7:F22),"")');
 put(sheet,'B27','Нет');put(sheet,'B28',id==='K01'?3:null);put(sheet,'B29',null);input(sheet,'B27:B29');
 sheet.getRange('B27').dataValidation={rule:{type:'list',values:['Нет','Да']}};
 sheet.dataValidations.add({range:'B28',rule:{type:'whole',operator:'greaterThan',formula1:0}});nonnegative(sheet,'B29');
 formula(sheet,'B30','=IF(AND(B27="Да",COUNT(B28:B29)=2,B28>0,B29>0,MOD(B28,1)=0,ISNUMBER(B26)),"Готово","Нужны данные")');
 formula(sheet,'B31','=IF(B30="Готово",B26/B28,"")');formula(sheet,'B32','=IF(B30="Готово",B29/B28,"")');
 sheet.getRange('B25:B26').setNumberFormat(money);sheet.getRange('B28:B29').setNumberFormat('#,##0');sheet.getRange('B31:B32').setNumberFormat(money);
 sheet.getRange('A30:B32').format.fill='#E7EEE7';sheet.getRange('B30').format.columnWidth=23;
 sheet.getRange('B30').conditionalFormats.addCustom('B30<>"Готово"',{fill:'#FCE6DD',font:{color:C.red,bold:true}});
 put(sheet,'D25','Брутто используется для закупки; нетто — для сверки потерь.');
 put(sheet,'D27','«Да» — после устранения пробелов и контрольной выпечки.');
 put(sheet,'D29','Взвесьте готовую остывшую партию без упаковки.');
 put(sheet,'A34',id==='Q01'?'2292 г — сумма сырья исходника, а не выход готового киша.':'Ложки, стаканы, штуки и 600–700 г сыра нужно перевести в точную закладку.');
 sheet.freezePanes.freezeRows(6);
}
recipe(feta,'Q01');recipe(potato,'K01');

base(main,'A1:G30');main.tabColor=C.ink;
['A:A','B:B','C:C','D:D','E:E','F:F','G:G'].forEach((x,i)=>main.getRange(x).format.columnWidth=[35,19,19,3,35,17,34][i]);
put(main,'A2','Пирогорск · сравнение себестоимости');
put(main,'A3','Плановые допущения на 29.10.2026. Сравнивайте одинаковые состав и вес.');
main.getRange('A5:C5').values=[['На один пирог, ₽','Готовый пирог','Своя выпечка']];header(main,'A5:C5');
main.getRange('E5:G5').values=[['Редактируемые условия','Значение','Основание']];header(main,'E5:G5');
const inputs=[
 ['Цена продажи пирога',1500,'Пример пользователя, не прогноз'],
 ['Пирогов в одном заказе',1,'План; доставка один раз на заказ'],
 ['Доставку оплачивает клиент, ₽',350,'План, не подтверждённый тариф'],
 ['Курьер за заказ, ₽',350,'План src/data/pricing.ts'],
 ['Резерв от выручки за пироги',.10,'План на налоги, комиссии и прочее'],
 ['Целевой вклад / выручка',.35,'План src/data/pricing.ts'],
 ['Шаг округления цены, ₽',10,'План src/data/pricing.ts'],
 ['Рецептура своей выпечки','K01','K01 — картофель; Q01 — киш фета'],
 ['Упаковка на пирог, ₽',40,'План src/data/pricing.ts'],
];main.getRange('E6:G14').values=inputs;input(main,'F6:F14');
main.getRange('F13').dataValidation={rule:{type:'list',values:['K01','Q01']}};
put(main,'E18','Готовый пирог · картофель и сыр');
const buy=[['Публичная цена до скидки, ₽',999,'P01 · карточка pirogi39, 850 г'],['Скидка самовывоза',.10,'Со слов пользователя; подтвердить'],['Вес готового пирога, г',850,'P01 · карточка pirogi39'],['Доля списаний готовых пирогов',0,'План; 0 означает отсутствие списаний'],['Подвоз на один пирог, ₽',5,'План src/data/pricing.ts']];
main.getRange('E20:G24').values=buy;input(main,'F20:F24');
main.getRange('E25:G27').values=[['Доля списаний своей выпечки',null,'Нужно задать, в том числе явно 0'],['Труд + энергия на пирог, ₽',null,'Нужен расчёт по пробной партии'],['Подвоз сырья на пирог, ₽',null,'Нужен расчёт закупочной партии']];input(main,'F25:F27');
for(const a of ['F6:F9','F12','F14','F20','F22','F24','F26:F27'])nonnegative(main,a);
for(const a of ['F10:F11','F21','F23','F25'])main.dataValidations.add({range:a,rule:{type:'decimal',operator:'between',formula1:0,formula2:.999999}});
main.dataValidations.add({range:'F7',rule:{type:'whole',operator:'greaterThan',formula1:0}});
main.getRange('F6:F27').setNumberFormat(money);for(const a of ['F10:F11','F21','F23','F25'])main.getRange(a).setNumberFormat(percent);main.getRange('F7').setNumberFormat('0');
const labels={6:'Статус',8:'Покупка / сырьё',9:'Добавка на списания',10:'Подвоз на изделие',11:'Труд и энергия производства',12:'Упаковка',13:'Прямые затраты на пирог',14:'Масса пирога, г',16:'Цена продажи',17:'Остаток до резерва и доставки',18:'Резерв от выручки',19:'Доставка за счёт нас / заказ',20:'Доставка за счёт нас / пирог',21:'Вклад на пирог',22:'Вклад / выручка',23:'Цена под целевой вклад',25:'Вклад на один заказ'};
for(const [r,t]of Object.entries(labels))put(main,`A${r}`,t);
formula(main,'B6','=IF(AND(COUNT(F6:F12)=7,F6>0,F7>0,MOD(F7,1)=0,F8>=0,F9>=0,F10>=0,F11>=0,F10+F11<1,F12>0,ISNUMBER(F14),F14>=0,COUNT(F20:F24)=5,F20>=0,F21>=0,F21<1,F22>0,F23>=0,F23<1,F24>=0),"Готово","Нужны данные")');
formula(main,'C6','=IF(AND(COUNT(F6:F12)=7,F6>0,F7>0,MOD(F7,1)=0,F8>=0,F9>=0,F10>=0,F11>=0,F10+F11<1,F12>0,ISNUMBER(F14),F14>=0,OR(F13="K01",F13="Q01"),IF(F13="K01",\'Картофыджын\'!B30,\'Киш фета\'!B30)="Готово",COUNT(F25:F27)=3,F25>=0,F25<1,F26>=0,F27>=0),"Готово","Нужны данные")');
formula(main,'B8','=IF(B6="Готово",F20*(1-F21),"")');
formula(main,'C8','=IF(C6="Готово",IF(F13="K01",\'Картофыджын\'!B31,\'Киш фета\'!B31),"")');
formula(main,'B9','=IF(B6="Готово",B8/(1-F23)-B8,"")');formula(main,'C9','=IF(C6="Готово",C8/(1-F25)-C8,"")');
formula(main,'B10','=IF(B6="Готово",F24,"")');formula(main,'C10','=IF(C6="Готово",F27,"")');
formula(main,'B11','=IF(B6="Готово",0,"")');formula(main,'C11','=IF(C6="Готово",F26,"")');
for(const col of ['B','C']){
 formula(main,`${col}12`,`=IF(${col}6="Готово",F14,"")`);
 formula(main,`${col}13`,`=IF(${col}6="Готово",SUM(${col}8:${col}12),"")`);
 formula(main,`${col}16`,`=IF(${col}6="Готово",F6,"")`);
 formula(main,`${col}17`,`=IF(${col}6="Готово",F6-${col}13,"")`);
 formula(main,`${col}18`,`=IF(${col}6="Готово",F6*F10,"")`);
 formula(main,`${col}19`,`=IF(${col}6="Готово",F9-F8,"")`);
 formula(main,`${col}20`,`=IF(${col}6="Готово",${col}19/F7,"")`);
 formula(main,`${col}21`,`=IF(${col}6="Готово",${col}17-${col}18-${col}20,"")`);
 formula(main,`${col}22`,`=IF(${col}6="Готово",${col}21/F6,"")`);
 formula(main,`${col}23`,`=IF(${col}6="Готово",MAX(0,ROUNDUP((${col}13+${col}20)/(1-F10-F11)/F12,0)*F12),"")`);
 formula(main,`${col}25`,`=IF(${col}6="Готово",${col}21*F7,"")`);
}
formula(main,'B14','=IF(B6="Готово",F22,"")');formula(main,'C14','=IF(C6="Готово",IF(F13="K01",\'Картофыджын\'!B32,\'Киш фета\'!B32),"")');
main.getRange('B8:C25').setNumberFormat(money);main.getRange('B22:C22').setNumberFormat(percent);main.getRange('B14:C14').setNumberFormat('#,##0');
for(const a of ['A13:C13','A21:C23','A25:C25'])main.getRange(a).format.fill='#E7EEE7';
main.getRange('B6:C6').conditionalFormats.addCustom('B6<>"Готово"',{fill:'#FCE6DD',font:{color:C.red,bold:true}});
main.getRange('B21:C21').conditionalFormats.addCustom('AND(ISNUMBER(B21),B21<0)',{fill:'#FCE6DD',font:{color:C.red,bold:true}});
put(main,'A28','Вклад — до аренды, постоянных расходов и инвестиций.');
put(main,'A29','Резерв применяется к выручке за пироги; платёж за доставку учитывается отдельно.');
put(main,'E29','Списания увеличивают закупку сырья; труд/энергию задайте на проданный пирог.');
main.getRange('E6:E27').format.wrapText=true;main.getRange('E6:G27').format.rowHeight=32;main.getRange('G6:G27').format.wrapText=true;

base(sources,'A1:F36');sources.getRange('A:A').format.columnWidth=8;sources.getRange('B:B').format.columnWidth=38;sources.getRange('C:C').format.columnWidth=22;sources.getRange('D:D').format.columnWidth=57;sources.getRange('E:E').format.columnWidth=70;sources.getRange('F:F').format.columnWidth=14;
put(sources,'A2','Техкарты и инструменты · проверка 29.10.2026');put(sources,'A3','12 открытых карт. Исходники для проработки; закупочные цены в них не подтверждены.');
sources.getRange('A5:F5').values=[['ID','Рецептура / сервис','Доступ / цена','Что проверить','Источник','Проверено']];header(sources,'A5:F5');
const sourceRows=facts.map(f=>[f.id,f.name,'Открытая страница',audit[f.id],f.url,'29.10.2026']);
sourceRows.push(
 ['P01','Готовый пирог: картофель и сыр','999 ₽ / 850 г','Скидка 10% — сообщение пользователя, не подтверждение поставщика.','https://pirogi39.ru/osetinskij-pirog-s-kartofelem-i-syirom/','29.10.2026'],
 ['S01','Технолог: разработка карт','От 170 ₽ / документ','Для 5–10: 210 ₽ за ТК и отдельно 210 ₽ за калькуляцию.','https://tekhnolog.com/','29.10.2026'],
 ['S02','1С-Рарус: сборник рецептур','9 600 ₽','Более 3500 рецептур; нужные начинки и совместимость уточнить до покупки.','https://rarus.ru/1c-restoran/sbornik-receptur-1/','29.10.2026'],
 ['S03','Шеф Эксперт','Цена не подтверждена','Демо и сборники есть; наличие нужных пирогов уточнить по составу.','https://www.chefexpert.ru/skachat-programmu/','29.10.2026'],
 ['S04','Saby Presto','Зависит от комплектации','Техкарты и себестоимость. /presto/price — услуги внедрения, не лицензия.','https://saby.ru/presto/opportunities','29.10.2026'],
 ['S05','Контур.Маркет','Демо 14 дней','Состав, закупочные цены, вложенные полуфабрикаты; тариф отдельно.','https://kontur.ru/market/features/tehcards','29.10.2026'],
 ['S06','Образцы калькуляций ОП-1','Открытая страница','Образцы других блюд; готовый файл для наших пирогов не подтверждён.','https://tekhnolog.com/2021/08/05/skachat-kalkulyatsionnye-karty/','29.10.2026'],
 ['S07','mister-snab.ru','Шаблон не найден','В поиске — сувенирная продукция; прямой запрос вернул HTTP 451.','https://mister-snab.ru/faq/','29.10.2026'],
 ['X01','Киш с лососем: ошибочная карта','Исключено','Внутри lobster concentrate и рыбные булочки; названию не соответствует.','https://tekhnolog.com/2024/09/25/kish-s-lososem-i-brokkoli-ttk8808/','29.10.2026'],
 ['M01','Плановые параметры проекта','Не фактические расходы','Доставка 350 ₽, упаковка 40 ₽, подвоз 5 ₽, резерв 10%, вклад 35%.','src/data/pricing.ts','29.10.2026']
);
sources.getRange(`A6:F${5+sourceRows.length}`).values=sourceRows;sources.getRange(`B6:E${5+sourceRows.length}`).format.wrapText=true;sources.getRange(`A6:F${5+sourceRows.length}`).format.rowHeight=52;sources.freezePanes.freezeRows(5);

// Exercise the same formulas with temporary, synthetic inputs, then restore them.
const qa=[];
function value(s,cell){return s.getRange(cell).values[0][0];}
function near(actual,expected,label){assert.equal(typeof actual,'number',`${label}: ${actual}`);assert.ok(Math.abs(actual-expected)<1e-7,`${label}: ${actual} != ${expected}`);qa.push({check:label,actual,expected});}
wb.recalculate();near(value(main,'B21'),405.9,'План покупки: 1500 − 899.1 − 5 − 40 − 150');assert.equal(value(main,'C21'),'');
put(main,'F8',0);put(main,'F7',2);wb.recalculate();near(value(main,'B20'),175,'Доставка 350 ₽ делится на 2 пирога');near(value(main,'B21'),230.9,'Вклад при доставке за наш счёт');
put(main,'F8',350);put(main,'F7',1);
const original=feta.getRange('D7:E22').values;const originalControls=feta.getRange('B27:B29').values;
for(let r=7;r<=20;r++){put(feta,`D${r}`,100);put(feta,`E${r}`,200);}put(feta,'B27','Да');put(feta,'B28',2);put(feta,'B29',2400);
put(main,'F13','Q01');put(main,'F25',0);put(main,'F26',30);put(main,'F27',10);wb.recalculate();near(value(feta,'B26'),280,'Контрольная партия: 14 × 100 г × 200 ₽/кг');near(value(main,'C8'),140,'Выбор Q01: сырьё на изделие');near(value(main,'C21'),1130,'Своя выпечка с контрольными входами');
put(main,'F20',null);wb.recalculate();near(value(main,'C21'),1130,'Нет цены готового пирога: своя выпечка считается независимо');assert.equal(value(main,'B21'),'');put(main,'F20',999);
put(feta,'E7',null);wb.recalculate();assert.equal(value(feta,'B31'),'');assert.equal(value(main,'C21'),'');qa.push({check:'Отсутствующая цена блокирует результат',actual:'подтверждено'});
put(feta,'D7',0);wb.recalculate();near(value(feta,'B26'),260,'Явный ноль закладки допускает пустую цену');
put(main,'F10',.7);put(main,'F11',.35);wb.recalculate();assert.equal(value(main,'B23'),'');qa.push({check:'Сумма резерва и цели >= 100% блокирует расчёт цены',actual:'подтверждено'});
feta.getRange('D7:E22').values=original;feta.getRange('B27:B29').values=originalControls;
put(main,'F13','K01');put(main,'F25',null);put(main,'F26',null);put(main,'F27',null);put(main,'F10',.10);put(main,'F11',.35);
wb.recalculate();near(value(main,'B21'),405.9,'Восстановлены исходные допущения');assert.equal(value(main,'C21'),'');
const errors=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:100},summary:'final formula error scan'});
assert.match(errors.ndjson,/matched 0 entries/);
await fs.mkdir(path.join(dir,'qa'),{recursive:true});await fs.mkdir(output,{recursive:true});
await fs.writeFile(path.join(dir,'qa','formula-checks.json'),JSON.stringify({checks:qa,errorScan:errors.ndjson,nativeExcelTested:false},null,2));
console.log((await wb.inspect({kind:'table',range:'Сравнение!A5:C25',include:'values,formulas',tableMaxRows:21,tableMaxCols:3})).ndjson);
for(const [s,r]of [[main,'A1:G30'],[feta,'A1:G35'],[potato,'A1:G35'],[sources,'A1:F18'],[sources,'A19:F28']]){
 const png=await wb.render({sheetName:s.name,range:r,scale:1.5,format:'png'});await fs.writeFile(path.join(dir,'qa',`${s.name}-${r.replace(':','-')}.png`),new Uint8Array(await png.arrayBuffer()));
}
const exported=await SpreadsheetFile.exportXlsx(wb);await exported.save(path.join(output,'pirogorsk-recipe-costing.xlsx'));
await fs.writeFile(path.join(dir,'source-index.json'),JSON.stringify(sourceRows.map(r=>({id:r[0],name:r[1],access_or_price:r[2],audit:r[3],url:r[4],checked_at:'2026-10-29'})),null,2));
console.log(`Exported ${output}/pirogorsk-recipe-costing.xlsx`);
