const API_URL = 'https://vibelock-app.onrender.com/api';

document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // Hide previous errors and show loading screen
    errorDiv.classList.remove('show');
    errorDiv.textContent = '';
    loadingOverlay.classList.add('show');
    
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
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Redirect to home
            window.location.href = 'home.html';
        } else {
            // Hide loading screen on error
            loadingOverlay.classList.remove('show');
            errorDiv.textContent = data.error || 'Signup failed';
            errorDiv.classList.add('show');
        }
    } catch (error) {
        loadingOverlay.classList.remove('show');
        console.error('Signup error:', error);
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.classList.add('show');
    }
});