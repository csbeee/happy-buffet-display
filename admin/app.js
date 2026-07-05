import { getTodayMenu } from "../firebase/firestore.js";
import { renderMenu } from "./menu-ui.js";

async function init(){

    const menu = await getTodayMenu();

    if(menu){

        renderMenu(menu);

    }

}

init();