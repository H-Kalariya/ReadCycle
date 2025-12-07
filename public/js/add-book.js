document.addEventListener('DOMContentLoaded', function() {
  const fetchBtn = document.getElementById('fetch-cover-btn');
  const coverImage = document.getElementById('cover-image');
  const coverStatus = document.getElementById('cover-status');
  const coverImageInput = document.getElementById('coverImage');
  const coverPreview = document.getElementById('cover-preview');

  if (fetchBtn) {
    fetchBtn.addEventListener('click', async function() {
      const title = document.getElementById('title').value;
      const author = document.getElementById('author').value;
      
      if (!title) {
        alert('Please enter a book title first');
        return;
      }
      
      fetchBtn.textContent = '⏳ Searching...';
      fetchBtn.disabled = true;
    
      try {
        const response = await fetch('/api/fetch-book-cover', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ title, author })
        });
        
        if (!response.ok) {
          throw new Error('HTTP error! status: ' + response.status);
        }
        
        const result = await response.json();
        console.log('API Response:', result);
        
        if (result.success) {
          if (result.coverImage) {
            coverImage.src = result.coverImage;
            coverImage.style.display = 'block';
            coverImageInput.value = result.coverImage;
            coverStatus.textContent = 'Found: ' + (result.title || title);
            coverStatus.style.color = '#155724';
            
            // Auto-fill description if available
            const descriptionField = document.getElementById('description');
            if (result.description && !descriptionField.value) {
              descriptionField.value = result.description.substring(0, 500);
            }
          } else {
            coverStatus.textContent = 'No cover image available for this book';
            coverStatus.style.color = '#721c24';
            coverImage.style.display = 'none';
          }
        } else {
          coverStatus.textContent = result.message || 'No book found matching the search criteria';
          coverStatus.style.color = '#721c24';
          coverImage.style.display = 'none';
        }
        
        coverPreview.style.display = 'block';
      } catch (error) {
        console.error('Error fetching cover:', error);
        coverStatus.textContent = 'Error fetching cover. Please try again.';
        if (error.message.includes('Failed to fetch')) {
          coverStatus.textContent += ' (Network error - check console for details)';
        }
        coverStatus.style.color = '#721c24';
        coverPreview.style.display = 'block';
        coverImage.style.display = 'none';
        
        // Show error message to user
        const responseMessage = document.getElementById('response-message');
        if (responseMessage) {
          responseMessage.textContent = 'Error: Could not load book cover. Please try again.';
          responseMessage.className = 'response-message error';
          responseMessage.style.display = 'block';
        }
      } finally {
        fetchBtn.textContent = '🔍 Find Book Cover';
        fetchBtn.disabled = false;
      }
    });
  }

  // Handle form submission
  const addBookForm = document.getElementById('add-book-form');
  if (addBookForm) {
    addBookForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const submitButton = this.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.textContent;
      submitButton.disabled = true;
      submitButton.textContent = 'Adding...';
      
      try {
        const formData = new FormData(this);
        const requestData = Object.fromEntries(formData);
        
        console.log('Submitting form data:', requestData);
        
        const response = await fetch('/add-book', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'same-origin', // Include cookies for session
          body: JSON.stringify(requestData)
        });
        
        console.log('Response status:', response.status);
        
        let result;
        try {
          result = await response.json();
          console.log('Response data:', result);
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
          throw new Error('Invalid response from server');
        }
        
        const responseMessage = document.getElementById('response-message');
        if (!responseMessage) {
          console.error('Response message element not found');
          throw new Error('Page error: Could not find response message element');
        }
        
        if (response.ok) {
          responseMessage.textContent = '✅ ' + (result.message || 'Book added successfully!');
          responseMessage.className = 'response-message success';
          responseMessage.style.display = 'block';
          
          // Reset form after successful submission
          setTimeout(() => {
            this.reset();
            if (coverImage) coverImage.style.display = 'none';
            if (coverStatus) {
              coverStatus.textContent = 'Click "Find Book Cover" to search for this book\'s cover image';
              coverStatus.style.color = '#888';
            }
            responseMessage.style.display = 'none';
            
            // Redirect to my-books page after a short delay
            setTimeout(() => {
              window.location.href = '/my-books';
            }, 1000);
            
          }, 1000);
        } else {
          const errorMsg = result.error || 'Failed to add book';
          console.error('Server error:', errorMsg);
          responseMessage.textContent = '❌ ' + errorMsg;
          responseMessage.className = 'response-message error';
          responseMessage.style.display = 'block';
        }
      } catch (error) {
        console.error('Error submitting form:', error);
        const responseMessage = document.getElementById('response-message');
        if (responseMessage) {
          responseMessage.textContent = '❌ Error: ' + (error.message || 'Failed to submit form. Please try again.');
          responseMessage.className = 'response-message error';
          responseMessage.style.display = 'block';
        } else {
          alert('Error: ' + (error.message || 'Failed to submit form. Please try again.'));
        }
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalButtonText;
        }
      }
    });
  }
});
