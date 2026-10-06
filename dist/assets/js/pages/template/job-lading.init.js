function windowScroll() {
  var e = document.getElementById("navbar");
  e &&
    (50 <= document.body.scrollTop || 50 <= document.documentElement.scrollTop
      ? e.classList.add("is-sticky")
      : e.classList.remove("is-sticky"));
}
function eventClicked() {
  (document.getElementById("form-event").classList.add("view-event"),
    document
      .getElementById("event-title")
      .classList.replace("d-block", "d-none"),
    document
      .getElementById("event-category")
      .classList.replace("d-block", "d-none"),
    document
      .getElementById("event-start-date")
      .parentNode.classList.add("d-none"),
    document
      .getElementById("event-start-date")
      .classList.replace("d-block", "d-none"),
    document.getElementById("event-time").setAttribute("hidden", !0),
    document.getElementById("timepicker1").parentNode.classList.add("d-none"),
    document
      .getElementById("timepicker1")
      .classList.replace("d-block", "d-none"),
    document.getElementById("timepicker2").parentNode.classList.add("d-none"),
    document
      .getElementById("timepicker2")
      .classList.replace("d-block", "d-none"),
    document
      .getElementById("event-location")
      .classList.replace("d-block", "d-none"),
    document
      .getElementById("event-description")
      .classList.replace("d-block", "d-none"),
    document
      .getElementById("event-start-date-tag")
      .classList.replace("d-none", "d-block"),
    document
      .getElementById("event-timepicker1-tag")
      .classList.replace("d-none", "d-block"),
    document
      .getElementById("event-timepicker2-tag")
      .classList.replace("d-none", "d-block"),
    document
      .getElementById("event-location-tag")
      .classList.replace("d-none", "d-block"),
    document
      .getElementById("event-description-tag")
      .classList.replace("d-none", "d-block"),
    document.getElementById("btn-save-event").setAttribute("hidden", !0));
}
function eventTyped() {
  (document.getElementById("form-event").classList.remove("view-event"),
    document
      .getElementById("event-title")
      .classList.replace("d-none", "d-block"),
    document
      .getElementById("event-category")
      .classList.replace("d-none", "d-block"),
    document
      .getElementById("event-start-date")
      .parentNode.classList.remove("d-none"),
    document
      .getElementById("event-start-date")
      .classList.replace("d-none", "d-block"),
    document
      .getElementById("timepicker1")
      .parentNode.classList.remove("d-none"),
    document
      .getElementById("timepicker1")
      .classList.replace("d-none", "d-block"),
    document
      .getElementById("timepicker2")
      .parentNode.classList.remove("d-none"),
    document
      .getElementById("timepicker2")
      .classList.replace("d-none", "d-block"),
    document
      .getElementById("event-location")
      .classList.replace("d-none", "d-block"),
    document
      .getElementById("event-description")
      .classList.replace("d-none", "d-block"),
    document
      .getElementById("event-start-date-tag")
      .classList.replace("d-block", "d-none"),
    document
      .getElementById("event-timepicker1-tag")
      .classList.replace("d-block", "d-none"),
    document
      .getElementById("event-timepicker2-tag")
      .classList.replace("d-block", "d-none"),
    document
      .getElementById("event-location-tag")
      .classList.replace("d-block", "d-none"),
    document
      .getElementById("event-description-tag")
      .classList.replace("d-block", "d-none"),
    document.getElementById("btn-save-event").removeAttribute("hidden"));
}
window.addEventListener("scroll", function (e) {
  (e.preventDefault(), windowScroll());
});
var swiper = new Swiper(".candidate-swiper", {
    slidesPerView: 1,
    spaceBetween: 30,
    loop: !0,
    autoplay: { delay: 2500, disableOnInteraction: !1 },
    pagination: { el: ".swiper-pagination", clickable: !0 },
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
    breakpoints: {
      1445: { slidesPerView: 4, spaceBetween: 24 },
      768: { slidesPerView: 2, spaceBetween: 24 },
    },
  }),
  mybutton = document.getElementById("back-to-top");
function scrollFunction() {
  100 < document.body.scrollTop || 100 < document.documentElement.scrollTop
    ? (mybutton.style.display = "block")
    : (mybutton.style.display = "none");
}
function topFunction() {
  ((document.body.scrollTop = 0), (document.documentElement.scrollTop = 0));
}
window.onscroll = function () {
  scrollFunction();
};
document.addEventListener("DOMContentLoaded", function () {
  const botaoAbrir = document.getElementById("btn-tenho-interesse");
  const botaoSalvar = document.getElementById("btn-save-event");
  const modalEl = document.getElementById("event-modal");

  if (!botaoAbrir || !botaoSalvar || !modalEl) {
    console.log("Algum elemento não foi encontrado");
    return;
  }

  const modal = new bootstrap.Modal(modalEl);

  botaoAbrir.addEventListener("click", function (e) {
    e.preventDefault();

    if (typeof eventTyped === "function") {
      eventTyped();
    }

    modal.show();
  });

  botaoSalvar.addEventListener("click", function (e) {
    e.preventDefault();

    const nome = document.getElementById("event-title")?.value || "";
    const endereco = document.getElementById("event-location")?.value || "";
    const telefone = document.getElementById("event-start-date")?.value || "";
    const descricao = document.getElementById("event-description")?.value || "";

    const dados = {
      nome,
      endereco,
      telefone,
      descricao,
    };

    console.log("Dados capturados:", dados);

    modal.hide();
  });
});
