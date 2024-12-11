<?php
/*
Plugin Name: ai_chat
Description: Adds an AI chat interface to your WordPress site
Version: 7.3
Author: Yufi Shiromiya
*/

// Prevent direct access to the plugin
if (!defined('WPINC')) {
    die;
}

class AI_Chat_Plugin {
    public function __construct() {
        // Activation hook
        register_activation_hook(__FILE__, [$this, 'activate']);

        // Add settings link
        add_filter('plugin_action_links_' . plugin_basename(__FILE__), [$this, 'add_settings_link']);

        // Add menu item
        add_action('admin_menu', [$this, 'add_settings_page']);
        add_action('admin_init', [$this, 'register_settings']);

        // Shortcode
        add_shortcode('ai_chat', [$this, 'render_chat_interface']);

        // AJAX actions
        add_action('wp_ajax_ai_chat_request', [$this, 'handle_chat_request']);
        add_action('wp_ajax_nopriv_ai_chat_request', [$this, 'handle_chat_request']);

        // Enqueue scripts
        add_action('wp_enqueue_scripts', [$this, 'enqueue_chat_scripts']);
    }

    public function activate() {
        // Any activation logic
        add_option('ai_chat_openai_key', '');
    }

    public function add_settings_link($links) {
        $settings_link = '<a href="options-general.php?page=ai-chat-settings">Settings</a>';
        array_unshift($links, $settings_link);
        return $links;
    }

    public function add_settings_page() {
        add_options_page(
            'AI Chat Settings', 
            'AI Chat', 
            'manage_options', 
            'ai-chat-settings', 
            [$this, 'render_settings_page']
        );
    }

    public function register_settings() {
        register_setting('ai_chat_settings', 'ai_chat_openai_key');
    }

    public function render_settings_page() {
        ?>
        <div class="wrap">
            <h1>AI Chat Settings</h1>
            <form method="post" action="options.php">
                <?php
                settings_fields('ai_chat_settings');
                do_settings_sections('ai_chat_settings');
                ?>
                <table class="form-table">
                    <tr>
                        <th>OpenAI API Key</th>
                        <td>
                            <input 
                                type="text" 
                                name="ai_chat_openai_key" 
                                value="<?php echo esc_attr(get_option('ai_chat_openai_key')); ?>" 
                                class="regular-text"
                            >
                            <p class="description">Enter your OpenAI API key to enable AI chat functionality.</p>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    public function render_chat_interface() {
        // Check if API key is set
        if (!get_option('ai_chat_openai_key')) {
            return '<p>AI Chat is not configured. Please set up the API key in the settings.</p>';
        }

        ob_start();
        ?>
        <div id="ai-chat-container" style="max-width:600px; margin:0 auto;">
            <div id="ai-chat-messages" style="height:300px; overflow-y:scroll; border:1px solid #ddd; padding:10px; margin-bottom:10px;"></div>
            <input type="text" id="ai-chat-input" placeholder="Ask me something..." style="width:100%; padding:10px; margin-bottom:10px;">
            <button id="ai-chat-send" style="width:100%; padding:10px;">Send</button>
        </div>
        <?php
        return ob_get_clean();
    }

    public function enqueue_chat_scripts() {
        wp_enqueue_script('jquery');
        wp_enqueue_script('ai-chat-script', plugin_dir_url(__FILE__) . 'ai-chat.js', ['jquery'], '1.0', true);
        wp_localize_script('ai-chat-script', 'aiChatAjax', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('ai_chat_nonce')
        ]);
    }

    public function handle_chat_request() {
        // Verify nonce for security
        check_ajax_referer('ai_chat_nonce', 'nonce');

        // Validate input
        $message = sanitize_text_field($_POST['message'] ?? '');

        if (empty($message)) {
            wp_send_json_error('No message provided');
        }

        // Get API key
        $api_key = get_option('ai_chat_openai_key');
        if (empty($api_key)) {
            wp_send_json_error('API key not configured');
        }

        // Call OpenAI API
        $response = $this->get_ai_response($api_key, $message);

        wp_send_json_success([
            'response' => $response
        ]);
    }

    private function get_ai_response($api_key, $message) {
        $response = wp_remote_post('https://api.openai.com/v1/chat/completions', [
            'timeout' => 30,
            'headers' => [
                'Authorization' => 'Bearer ' . $api_key,
                'Content-Type' => 'application/json'
            ],
            'body' => json_encode([
                'model' => 'gpt-3.5-turbo',
                'messages' => [
                    ['role' => 'user', 'content' => $message]
                ]
            ])
        ]);

        if (is_wp_error($response)) {
            return 'Error connecting to AI service: ' . $response->get_error_message();
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if (isset($data['error'])) {
            return 'OpenAI API Error: ' . $data['error']['message'];
        }

        return $data['choices'][0]['message']['content'] ?? 'No response';
    }
}

// Initialize the plugin
new AI_Chat_Plugin();
