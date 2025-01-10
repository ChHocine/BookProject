document.getElementById('uploadForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(this);

    fetch('admin_page_upload.php', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            console.log(data); 
            const chatMessages = document.getElementById('chatMessages');
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message');
            messageDiv.textContent = data.message;

            if (data.status === 'success') {
                messageDiv.classList.add('success');
                const filesList = document.getElementById('files');
                filesList.innerHTML = '';

                data.files.forEach(file => {
                    const li = document.createElement('li');
                    li.textContent = file;
                    filesList.appendChild(li);
                });
            } else {
                messageDiv.classList.add('error');
            }

            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight; 
        })
        .catch(error => {
            console.error('Error:', error); 
            const chatMessages = document.getElementById('chatMessages');
            const errorDiv = document.createElement('div');
            errorDiv.classList.add('message', 'error');
            errorDiv.textContent = 'An error occurred during the upload process.';
            chatMessages.appendChild(errorDiv);
        });
});
