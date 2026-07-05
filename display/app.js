import { watchTodayMenu } from "../firebase/firestore.js";

function draw(id, items) {

    const ul = document.getElementById(id);
    ul.innerHTML = "";

    if (!items) return;

    items.forEach(item => {

        const li = document.createElement("li");
        li.textContent = item;
        ul.appendChild(li);

    });

}

function updateClock() {

    const now = new Date();

    document.getElementById("clock").textContent =
        now.toLocaleTimeString("ko-KR");

    document.getElementById("date").textContent =
        now.toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long"
        });

}

updateClock();
setInterval(updateClock, 1000);


// Firestore 실시간 감시
watchTodayMenu((menu) => {

    draw("soup", menu.soup);
    draw("main", menu.main);
    draw("side", menu.side);
    draw("kimchi", menu.kimchi);
    draw("dessert", menu.dessert);

    document.getElementById("notice").textContent =
        menu.notice;

    if (menu.updatedAt) {

    const date = menu.updatedAt.toDate();

    document.getElementById("updatedAt").textContent =
        "최종 업데이트 : " +
        date.toLocaleString("ko-KR");

}
});