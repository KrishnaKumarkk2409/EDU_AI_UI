import os
import re
import openai
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from dotenv import load_dotenv
import mysql.connector
from argon2 import PasswordHasher
from authlib.integrations.flask_client import OAuth
import secrets

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = "your_secret_key"  

# Get OpenAI API Key from .env
openai.api_key = os.getenv("OPENAI_API_KEY")
FINE_TUNED_MODEL = os.getenv("FINE_TUNED_MODEL")

# Get Database credentials from .env
db_host = os.getenv('DB_HOST')
db_user = os.getenv('DB_USER')
db_password = os.getenv('DB_PASSWORD')
db_name = os.getenv('DB_NAME') 
db_edu_users = os.getenv('DB_SIGNUP') 

# Database connection function
def get_db_connection():
    connection = mysql.connector.connect(
        host=db_host,
        user=db_user,
        password=db_password,
        database=db_name
    )
    return connection

def get_db_connection_users():
    connection = mysql.connector.connect(
        host=db_host,
        user=db_user,
        password=db_password,
        database=db_edu_users
    )
    return connection


# Get all tables dynamically
def get_all_tables():
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute("SHOW TABLES;")
    tables = [table[0] for table in cursor.fetchall()]
    connection.close()
    return tables

# Extract keywords using OpenAI model
def extract_keywords(user_query):
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": "Extract the most relevant keywords for search from the given user query."},
                  {"role": "user", "content": user_query}]
    )
    keywords = response["choices"][0]["message"]["content"]
    return re.findall(r'\b\w+\b', keywords)

# Generate SQL query dynamically based on keywords
def generate_sql_query(user_query):
    tables = get_all_tables()
    keywords = extract_keywords(user_query)

    if not tables:
        return "No tables found in the database."

    if not keywords:
        return "No relevant keywords found in the query."

    search_conditions = []
    for keyword in keywords:
        search_conditions.append(f"title LIKE '%{keyword}%' OR summary LIKE '%{keyword}%' OR content LIKE '%{keyword}%'")

    search_condition = " OR ".join(search_conditions)

    # Construct a UNION ALL query to search in all tables
    union_queries = []
    for table in tables:
        # Select all fields except 'image' and 'image_link'
        union_queries.append(f"SELECT id, title, date_of_published, summary, link, content, '{table}' AS source_table "
                             f"FROM {table} WHERE {search_condition}")

    final_query = " UNION ALL ".join(union_queries) + " ORDER BY date_of_published DESC LIMIT 100;"
    return final_query

# Execute SQL Query and fetch results
def execute_query(user_query):
    sql_query = generate_sql_query(user_query)

    if "No tables found" in sql_query or "No relevant keywords" in sql_query:
        return sql_query

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(sql_query)
        columns = [desc[0] for desc in cursor.description]  # Fetch column names
        results = cursor.fetchall()
        connection.close()

        return results, columns if results else ("No results found.", [])

    except Exception as e:
        return f"Error executing query: {str(e)}", []

def format_ai_response(ai_response):
    ai_response = re.sub(r'(\d+)\.\s*(.*?)\s*(?=\d+\.\s*|$)', r'\1. **\2**', ai_response)
    ai_response = re.sub(r'\b([A-Za-z0-9 ]+)\b(?=\s*\()', r'**\1**', ai_response)
    ai_response = re.sub(r'(\n\s*)+', r'\n\n', ai_response)
    ai_response = re.sub(r'(?<=\n)([A-Za-z0-9 ]+):', r'\n### **\1**:', ai_response)
    return ai_response


oauth = OAuth(app)

# Register Google OAuth
google = oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    api_base_url='https://www.googleapis.com/oauth2/v3/',
    client_kwargs={
        'scope': 'openid email profile https://www.googleapis.com/auth/user.phonenumbers.read https://www.googleapis.com/auth/user.birthday.read'
    }
)

@app.route('/google/login')
def google_login():
    redirect_uri = url_for('google_callback', _external=True)
    return google.authorize_redirect(redirect_uri)

@app.route('/google/callback')
def google_callback():
    try:
        token = google.authorize_access_token()
        print("Token Response:", token)  # Debugging statement

        # Fetch user info
        resp = google.get('userinfo')  # Or use the full URL
        user_info = resp.json()
        print("User Info:", user_info)  # Debugging statement

        google_id = user_info.get('sub')
        email = user_info.get('email', None)
        first_name = user_info.get('given_name', '')
        last_name = user_info.get('family_name', '')
        profile_image = user_info.get('picture', '')
        phone_number = user_info.get('phone_number', '')  # New field
        dob = user_info.get('birthday', None)  # New field
        profession = ''  # Not provided by Google
        city = ''  # New field
        state = ''  # New field
        country = ''  # New field

        if not email:
            print("Error: Email not found in the user info.")
            email = "info@example.com"

        ph = PasswordHasher()
        random_password = secrets.token_hex(16)
        hashed_password = ph.hash(random_password)

        conn = get_db_connection_users()
        cursor = conn.cursor(dictionary=True)

        # Check if this Google user already exists
        select_query = "SELECT id FROM google_users WHERE google_id = %s"
        cursor.execute(select_query, (google_id,))
        existing_user = cursor.fetchone()

        # Insert or update user data
        if not existing_user:
            insert_query = """
                INSERT INTO google_users
                (google_id, email, first_name, last_name, phone_number, dob, profession, password, profile_image, city, state, country)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(
                insert_query,
                (google_id, email, first_name, last_name,
                 phone_number, dob, profession, hashed_password, profile_image, city, state, country)
            )
        else:
            update_query = """
                UPDATE google_users
                SET email = %s,
                    first_name = %s,
                    last_name = %s,
                    phone_number = %s,
                    dob = %s,
                    profession = %s,
                    profile_image = %s,
                    city = %s,
                    state = %s,
                    country = %s
                WHERE google_id = %s
            """
            cursor.execute(
                update_query,
                (email, first_name, last_name,
                 phone_number, dob, profession, profile_image, city, state, country, google_id)
            )

        conn.commit()
        cursor.close()
        conn.close()

        session['logged_in'] = True
        session['google_id'] = google_id
        session['email'] = email
        session['user_name'] = first_name
        session['last_name'] = last_name
        session['profile_image'] = profile_image

        session['show_update_profile'] = True  
        flash("Google login successful!", "success")
        return redirect(url_for('home'))
    except Exception as e:
        flash(f"Google login error: {str(e)}", "error")
        return redirect(url_for('home'))
    
@app.route('/update_profile', methods=['POST'])
def update_profile():
    if request.method == 'POST':
        city = request.form.get('city')
        state = request.form.get('state')
        country = request.form.get('country')
        phone_number = request.form.get('phone_number')
        dob = request.form.get('dob')
        profession = request.form.get('profession')

        google_id = session.get('google_id')

        if google_id:
            conn = get_db_connection_users()
            cursor = conn.cursor(dictionary=True)

            update_query = """
                UPDATE google_users
                SET city = %s,
                    state = %s,
                    country = %s,
                    phone_number = %s,
                    dob = %s,
                    profession = %s
                WHERE google_id = %s
            """
            cursor.execute(
                update_query,
                (city, state, country, phone_number, dob, profession, google_id)
            )

            conn.commit()
            cursor.close()
            conn.close()

            session['show_update_profile'] = False
            flash("Profile updated successfully!", "success")
        else:
            flash("User not logged in.", "error")

        return redirect(url_for('home'))
    
@app.route('/check_show_modal')
def check_show_modal():
    return jsonify(show_update_profile=session.get('show_update_profile', False))

@app.route('/clear_show_modal', methods=['POST'])
def clear_show_modal():
    session['show_update_profile'] = False
    return '', 204

LINKEDIN_CLIENT_ID = os.getenv('LINKEDIN_CLIENT_ID')
LINKEDIN_CLIENT_SECRET = os.getenv('LINKEDIN_CLIENT_SECRET')

# Register LinkedIn OAuth
linkedin = oauth.register(
    name='linkedin',
    client_id=LINKEDIN_CLIENT_ID,
    client_secret=LINKEDIN_CLIENT_SECRET,
    authorize_url='https://www.linkedin.com/oauth/v2/authorization',
    access_token_url='https://www.linkedin.com/oauth/v2/accessToken',
    client_kwargs={'scope': 'profile w_member_social email'}
)

@app.route('/linkedin/login')
def linkedin_login():
    state = secrets.token_hex(16)  
    session['oauth_state'] = state  
    redirect_uri = url_for('linkedin_callback', _external=True)
    print("Generated Redirect URI:", redirect_uri)
    print("OAuth State (Sent):", state)
    return linkedin.authorize_redirect(redirect_uri, state=state)

@app.route('/authentication/linkedin-oauth-callback/')
def linkedin_callback():
    try:
        callback_url = request.url
        print("Callback URL:", callback_url)
        
        # Check for errors in the callback
        if 'error' in request.args:
            error = request.args.get('error')
            error_description = request.args.get('error_description', 'Unknown error')
            print(f"OAuth Error: {error} - {error_description}")
            flash(f"LinkedIn login error: {error_description}", "error")
            return redirect(url_for('home'))
        
        stored_state = session.pop('oauth_state', None)
        received_state = request.args.get('state')

        print("Stored OAuth State:", stored_state)
        print("Received OAuth State:", received_state)

        if not stored_state or stored_state != received_state:
            raise ValueError("CSRF Warning! State mismatch.")

        token = linkedin.authorize_access_token()
        print("Token Response:", token)
        
        if 'access_token' not in token:
            print("Token error - missing access_token:", token)
            raise ValueError("Failed to obtain access token")

        # Fetch basic profile data
        user_info = linkedin.get('v2/me').json()
        print("User Info Response:", user_info)
        
        # Initialize email variable
        email = ""
        
        # Try to get email if scope includes email
        try:
            email_response = linkedin.get('v2/emailAddress?q=members&projection=(elements*(handle~))').json()
            print("Email Response:", email_response)
            if 'elements' in email_response and email_response['elements']:
                email_element = email_response['elements'][0]
                if 'handle~' in email_element and 'emailAddress' in email_element['handle~']:
                    email = email_element['handle~']['emailAddress']
        except Exception as email_error:
            print(f"Warning: Could not fetch email: {str(email_error)}")
        
        # Try to fetch more detailed profile data
        try:
            detailed_profile = linkedin.get('v2/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams),headline,location,industry,vanityName,summary)').json()
            user_info.update(detailed_profile)
            print("Detailed Profile Response:", detailed_profile)
        except Exception as profile_error:
            print(f"Warning: Could not fetch detailed profile: {str(profile_error)}")

        linkedin_id = user_info.get('id')
        if not linkedin_id:
            raise ValueError("Could not obtain LinkedIn ID from the response")

        first_name = user_info.get('localizedFirstName', '')
        last_name = user_info.get('localizedLastName', '')
        profile_image = ""
        headline = user_info.get('headline', '')
        location = user_info.get('location', {}).get('name', '')
        industry = user_info.get('industry', '')
        profile_url = f"https://www.linkedin.com/in/{user_info.get('vanityName', linkedin_id)}"

        # Connect to the database with error handling
        try:
            conn = get_db_connection_users()
            cursor = conn.cursor(dictionary=True)

            # Check if the LinkedIn user already exists
            select_query = "SELECT id, email FROM linkedin_users WHERE linkedin_id = %s"
            cursor.execute(select_query, (linkedin_id,))
            existing_user = cursor.fetchone()

            # Insert or update user data
            if not existing_user:
                insert_query = """
                    INSERT INTO linkedin_users
                    (linkedin_id, email, first_name, last_name, profile_image, headline, 
                    location, industry, profile_url, summary, profession)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                cursor.execute(
                    insert_query,
                    (linkedin_id, email, first_name, last_name, profile_image, headline,
                    location, industry, profile_url, "", headline)
                )
                print(f"Created new LinkedIn user: {first_name} {last_name} ({linkedin_id})")
            else:
                update_query = """
                    UPDATE linkedin_users
                    SET email = %s, first_name = %s, last_name = %s, profile_image = %s, headline = %s,
                        location = %s, industry = %s, profile_url = %s
                    WHERE linkedin_id = %s
                """
                cursor.execute(
                    update_query,
                    (email, first_name, last_name, profile_image, headline, location,
                    industry, profile_url, linkedin_id)
                )
                print(f"Updated existing LinkedIn user: {first_name} {last_name} ({linkedin_id})")

            conn.commit()
            cursor.close()
            conn.close()
        except Exception as db_error:
            print(f"Database error: {str(db_error)}")
            cursor.close()
            conn.close()
            raise ValueError(f"Database error: {str(db_error)}")

        # Store session variables for the logged-in user
        session['logged_in'] = True
        session['linkedin_id'] = linkedin_id
        session['user_name'] = first_name
        session['last_name'] = last_name
        session['profile_image'] = profile_image
        session['email'] = email

        flash("LinkedIn login successful!", "success")
        return redirect(url_for('home'))
    except Exception as e:
        print("Error Details:", str(e))  # Debugging statement
        flash(f"LinkedIn login error: {str(e)}", "error")
        return redirect(url_for('home'))

@app.route('/')
def index():
    session['chat_history'] = []  
    return render_template('dashboard/home.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        # Fetch email & password from form
        email = request.form.get('email')
        password = request.form.get('password')
        
        try:
            # Connect to the 'edu_users' database to check login credentials
            conn = get_db_connection_users()
            cursor = conn.cursor(dictionary=True)
            
            # Query to fetch user data by email
            cursor.execute("SELECT first_name, last_name, password FROM signup WHERE email = %s", (email,))
            user = cursor.fetchone()  # Retrieve the user

            # If user is found, verify the password
            if user:
                # Verify password
                stored_hash = user['password']
                ph = PasswordHasher()
                try:
                    ph.verify(stored_hash, password)

                    # Store first and last name in session
                    session['logged_in'] = True
                    session['user_name'] = user['first_name']  # Store first name
                    session['last_name'] = user['last_name']  # Store last name
                    
                    flash("Login successful", "success")
                    return redirect(url_for('home'))
                except Exception as e:
                    flash("Invalid password", "error")
                    return redirect(url_for('login'))
            else:
                flash("No user found with that email", "error")
                return redirect(url_for('login'))

        except mysql.connector.Error as err:
            flash(f"MySQL Error: {err}", "error")
            return redirect(url_for('login'))
        except Exception as e:
            flash(f"Unexpected error: {str(e)}", "error")
            return redirect(url_for('login'))

    return render_template('dashboard/home.html')


@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        # Grab form fields
        first_name = request.form.get('first_name')
        last_name = request.form.get('last_name')
        email = request.form.get('email')
        phone = request.form.get('phone')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        dob = request.form.get('dob')
        profession = request.form.get('profession')

        # 1. Check if passwords match
        if password != confirm_password:
            flash("Passwords do not match", "error")
            return redirect(url_for('signup'))

        # 2. Hash the password using Argon2
        try:
            ph = PasswordHasher()
            hashed_password = ph.hash(password)
        except Exception as e:
            flash(f"Error hashing password: {str(e)}", "error")
            return redirect(url_for('signup'))

        # 3. Insert into the signup table
        try:
            conn = get_db_connection_users()
            cursor = conn.cursor()
            insert_query = """
                INSERT INTO signup (first_name, last_name, email, phone, password, dob, profession)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(
                insert_query,
                (first_name, last_name, email, phone, hashed_password, dob, profession)
            )
            conn.commit()
            cursor.close()
            conn.close()

            flash("Signup successful! Your details have been added.", "success")
        except Exception as e:
            flash(f"Error: {str(e)}", "error")
            return redirect(url_for('signup'))

        # 4. Set session variables and redirect
        session['logged_in'] = True
        session['user_name'] = first_name
        return redirect(url_for('home'))

    return render_template('dashboard/home.html')


@app.route('/logout')
def logout():
    session.clear()  # Clears the session data
    return redirect(url_for('home'))  # Redirect to home after logout


@app.route('/home')
def home():
    return render_template('dashboard/home.html', active_page='home')

@app.route('/chat')
def ai():
    return render_template('dashboard/chat_screen.html', active_page='chat')

@app.route('/learning')
def learning():
    return render_template('dashboard/my_learning.html', active_page='learning')

@app.route('/profile')
def profile():
    print(session)
    return render_template('dashboard/profile.html', active_page='profile')

@app.route('/general_knowledge')
def general_knowledge():
    return render_template('dashboard/general_knowledge.html')

@app.route('/details')
def details():
    # Get the article ID from the query parameters
    news_id = request.args.get('id')
    
    if not news_id:
        return "Error: Missing article ID", 400

    # Pass the article ID to the details page
    return render_template('dashboard/details.html', news_id=news_id)

@app.route('/api/news', methods=['GET'])
def get_news():
    try:
        # Connect to the database
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Query to fetch data
        query = "SELECT id, title, date_of_published, image_link, summary, content FROM addaConnector ORDER BY date_of_published DESC"
        cursor.execute(query)
        news_data = cursor.fetchall()

        # Close the connection
        cursor.close()
        conn.close()

        # Return the data as JSON
        return jsonify(news_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/news/<int:news_id>', methods=['GET'])
def get_news_details(news_id):
    try:
        # Connect to the database
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Query to fetch the full news details based on the ID
        query = "SELECT * FROM addaConnector WHERE id = %s"
        cursor.execute(query, (news_id,))
        news_detail = cursor.fetchone()

        # Close the connection
        cursor.close()
        conn.close()

        if news_detail:
            return jsonify(news_detail), 200
        else:
            return jsonify({"error": "News not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    user_input = data.get('text', '')

    # Retrieve previous conversation history from session
    if 'chat_history' not in session:
        session['chat_history'] = []

    session['chat_history'].append({"role": "user", "content": user_input})

    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",  
            messages=[{"role": "system", "content": "You are a helpful AI assistant."}] + session['chat_history'],
            max_tokens=150
        )

        ai_reply = response['choices'][0]['message']['content'].strip()
        ai_reply = format_ai_response(ai_reply)

        # Integrate with database logic if the user is asking for data
        if "data" in ai_reply or "query" in ai_reply:
            # Use the natural language query to fetch data from the database
            results, columns = execute_query(user_input)
            
            if isinstance(results, str):  # Error message or no results
                ai_reply = results
            else:
                # Display the database results as part of the response
                ai_reply = f"Here are your results:\n" + "\n".join([str(dict(zip(columns, row))) for row in results])

        session['chat_history'].append({"role": "assistant", "content": ai_reply})

    except Exception as e:
        ai_reply = f"Error: {str(e)}"

    return jsonify({'reply': ai_reply, 'chat_history': session['chat_history']})
    

if __name__ == '__main__':
    app.run(debug=True)
