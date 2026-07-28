export interface PdfItem {

  id:number;

  title:string;

  description:string;

  file:string;

  totalPages:number;

}

export const pdfData:PdfItem[]=[

{

id:1,

title:"Chapter 1",

description:"Numbers",

file:"chapter1.pdf",

totalPages:48

},

{

id:2,

title:"Chapter 2",

description:"Addition",

file:"chapter2.pdf",

totalPages:62

},

{

id:3,

title:"Chapter 3",

description:"Subtraction",

file:"chapter3.pdf",

totalPages:54

}

];