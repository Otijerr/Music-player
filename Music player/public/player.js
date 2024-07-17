document.getElementById('show-register').addEventListener('click', function() {
    var registerSection = document.getElementById('register-section');
    var showRegisterButton = document.getElementById('show-register');
    registerSection.style.display = 'block';
    showRegisterButton.style.display = 'none';
});

const urlParams = new URLSearchParams(window.location.search);
const errorMessage = urlParams.get('error');
const formType = urlParams.get('form');

if (errorMessage) {
    var errorDiv;
    if (formType === 'register') {
        document.getElementById('register-section').style.display = 'block';
        document.getElementById('show-register').style.display = 'none';
        errorDiv = document.getElementById('error-message');
    } else {
        errorDiv = document.getElementById('error-message-login');
    }
    errorDiv.textContent = errorMessage;
    errorDiv.style.display = 'block';
}