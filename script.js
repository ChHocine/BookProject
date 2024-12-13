document.getElementById('question-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const question = document.getElementById('question').value;

    if (question.trim() !== "") {
        alert("Your question has been received. We will get back to you with an answer sourced from credible books.");
        document.getElementById('question').value = "";  // Clear input after submission
    } else {
        alert("Please type your question.");
    }
});
