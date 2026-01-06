const ORIGIN = window.location.origin || '';
const IS_FILE = ORIGIN.startsWith('file');
const API_URL = localStorage.getItem('API_URL') || (IS_FILE ? 'https://vibelock-app.onrender.com/api' : (ORIGIN.includes('localhost') || ORIGIN.includes('127.0.0.1')) ? 'https://vibelock-app.onrender.com/api' : '/api');

document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');
    
    // Hide previous errors
    errorDiv.classList.remove('show');
    errorDiv.textContent = '';
    
    try {
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
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
            errorDiv.textContent = data.error || 'Signup failed';
            errorDiv.classList.add('show');
        }
    } catch (error) {
        console.error('Signup error:', error);
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.classList.add('show');
    }
});
