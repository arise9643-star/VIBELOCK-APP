const ORIGIN = window.location.origin || '';
const IS_FILE = ORIGIN.startsWith('file');
const API_URL = localStorage.getItem('API_URL') || (IS_FILE ? 'http://localhost:3000/api' : (ORIGIN.includes('localhost') || ORIGIN.includes('127.0.0.1')) ? 'http://localhost:3000/api' : '/api');

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');
    
    // Hide previous errors
    errorDiv.classList.remove('show');
    errorDiv.textContent = '';
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Save token and user info
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Redirect to home
            window.location.href = 'home.html';
        } else {
            // Show error
            errorDiv.textContent = data.error || 'Login failed';
            errorDiv.classList.add('show');
        }
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.classList.add('show');
    }
});
