// === CONFIGURE AQUI A SUA URL DO WEB APP ===
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxU4wnys87zx0X3rX55hN_pmo5oc1LGr6plz1O9vi27vmiykn4eI6Ruj6alXsTWJi9k2g/exec";

document.getElementById("relatorio-mensal").addEventListener("submit", async function (e) {
  e.preventDefault();

  // Transformar todos os campos do formulário em JSON
  const formData = new FormData(this);
  const data = Object.fromEntries(formData.entries());

  try {
    const resposta = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const texto = await resposta.text();

    if (resposta.ok) {
      alert("Relatório enviado com sucesso!");
      this.reset();
    } else {
      alert("Erro ao enviar. Resposta do servidor:\n" + texto);
    }

  } catch (erro) {
    alert("Erro ao conectar com o servidor:\n" + erro);
  }
});
