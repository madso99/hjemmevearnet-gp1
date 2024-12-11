jQuery(document).ready(function($) {
    $('#ai-chat-send').on('click', function() {
        const message = $('#ai-chat-input').val();
        
        if (!message.trim()) return;

        // Append user message
        $('#ai-chat-messages').append(
            `<div style="text-align:right; margin-bottom:10px;">
                <strong>You:</strong> ${message}
            </div>`
        );

        // Clear input
        $('#ai-chat-input').val('');

        // Send AJAX request
        $.ajax({
            url: aiChatAjax.ajax_url,
            type: 'POST',
            data: {
                action: 'ai_chat_request',
                message: message,
                nonce: aiChatAjax.nonce
            },
            success: function(response) {
                if (response.success) {
                    $('#ai-chat-messages').append(
                        `<div style="text-align:left; margin-bottom:10px; color:blue;">
                            <strong>AI:</strong> ${response.data.response}
                        </div>`
                    );
                    
                    // Scroll to bottom
                    $('#ai-chat-messages').scrollTop($('#ai-chat-messages')[0].scrollHeight);
                } else {
                    $('#ai-chat-messages').append(
                        `<div style="text-align:left; margin-bottom:10px; color:red;">
                            <strong>Error:</strong> ${response.data}
                        </div>`
                    );
                }
            },
            error: function() {
                $('#ai-chat-messages').append(
                    `<div style="text-align:left; margin-bottom:10px; color:red;">
                        <strong>Error:</strong> Unable to send message
                    </div>`
                );
            }
        });
    });

    // Allow sending with Enter key
    $('#ai-chat-input').on('keypress', function(e) {
        if (e.which == 13) {
            $('#ai-chat-send').click();
        }
    });
});
