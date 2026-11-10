// Configurações do jogo do Risotto.
window.CONFIG = {
  dogName: "Risotto",
  // Adicione as 8 fotos das cartas na pasta img/.
  photos: [
    "img/foto1.jpg", "img/foto2.jpg", "img/foto3.jpg", "img/foto4.jpg",
    "img/foto5.jpg", "img/foto6.jpg", "img/foto7.jpg", "img/foto8.jpg"
  ],
  // Fotos especiais sorteadas ao terminar (não aparecem nas cartas).
  special: ["img/especial1.jpg", "img/especial2.jpg", "img/especial3.jpg"],
  alarmEvery: 4,
  // Preencha com os dados do projeto Firebase para habilitar login e ranking global.
  firebase: {
    apiKey: "COLE_AQUI",
    authDomain: "",
    projectId: "",
    appId: ""
  }
};
