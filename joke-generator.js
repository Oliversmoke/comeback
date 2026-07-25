/**
 * Random Joke Generator
 * Fetches jokes from the JokeAPI external API
 */

const https = require('https');

/**
 * Fetch a random joke from JokeAPI
 * @param {Object} options - Configuration options
 * @param {string} options.type - Joke type: 'single', 'twopart', or 'any' (default: 'any')
 * @param {boolean} options.safe - Safe mode (no explicit jokes) (default: true)
 * @returns {Promise<Object>} Joke object containing the joke content
 */
async function getRandomJoke(options = {}) {
  const { type = 'any', safe = true } = options;

  return new Promise((resolve, reject) => {
    // Build API URL with query parameters
    const safeMode = safe ? '&safe-mode' : '';
    const url = `https://v2.jokeapi.dev/joke/${type}${safeMode}`;

    https.get(url, (res) => {
      let data = '';

      // Collect response data
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jokeData = JSON.parse(data);

          if (jokeData.error) {
            reject(new Error(`API Error: ${jokeData.message}`));
          } else {
            resolve(jokeData);
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`Failed to fetch joke: ${error.message}`));
    });
  });
}

/**
 * Display a joke in a formatted way
 * @param {Object} joke - Joke object from the API
 */
function displayJoke(joke) {
  console.log('\n🎭 Joke of the Moment 🎭\n');

  if (joke.type === 'single') {
    // Single-line joke
    console.log(joke.joke);
  } else if (joke.type === 'twopart') {
    // Two-part joke (setup + delivery)
    console.log(`Setup: ${joke.setup}`);
    console.log(`\nPunchline: ${joke.delivery}`);
  }

  console.log(`\n📁 Category: ${joke.category}`);
  console.log('---\n');
}

/**
 * Main function to run the joke generator
 */
async function main() {
  try {
    console.log('Fetching a random joke...');

    // Fetch a random joke (safe mode enabled by default)
    const joke = await getRandomJoke({
      type: 'any',
      safe: true,
    });

    displayJoke(joke);

    // Optionally fetch more jokes
    console.log('Fetching another joke...\n');
    const anotherJoke = await getRandomJoke({
      type: 'twopart', // Try to get a two-part joke
      safe: true,
    });

    displayJoke(anotherJoke);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the generator
main();

module.exports = { getRandomJoke, displayJoke };
