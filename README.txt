Laboratório WEBSEC — Desafio Final

Como usar:
1. Extraia o ZIP completo.
2. Abra o arquivo index.html no navegador.
3. Mantenha a pasta assets junto do index.html, pois o vídeo está em assets/convite-video.mp4.

Fluxo:
- O professor verá inicialmente apenas um laboratório de segurança web.
- Após concluir SQL Injection, CSRF e XSS, o convite real aparece.
- Cada desafio possui uma seção "Dica com resposta" para evitar travar a brincadeira.
- Ao clicar em "Sim, aceito!", o vídeo abre em tela maior e tenta iniciar automaticamente.
- O botão "Não" foge pela tela inteira ao passar o mouse, clicar ou tocar.

Respostas dos desafios:
1. SQL Injection
   Usuário: admin
   Senha: ' OR '1'='1' --

2. CSRF
<form method="POST" action="/lab/confirmacao-operacao" style="display:none">
  <input type="hidden" name="confirmacao" value="sim">
  <input type="hidden" name="nivel" value="professor">
</form>
<script>document.forms[0].submit();</script>

3. XSS refletido
<img src=x onerror="alert('WEBSEC')">

Atalho de emergência para apresentação:
Ctrl + Shift + F libera todas as etapas.
