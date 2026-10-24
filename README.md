# fufufafa-quotes-api
## Introduction
So, this repository was made by an idea that i had when i scrolling my Facebook page and found interesting post from [Ingin Menjadi Programmer Handal, Namun Enggan Mengoding](https://www.facebook.com/share/p/1FeCf8mRn4/) group who informed that someone had created a [fufufafa-memorable-quote](https://github.com/fufufufafafa/fufufafa-memorable-quotes/) repository containing a collection of words that he had uploaded on Kaskus. So, i decided to make it as API that can give you random quote from Fufufafa's Kaskus Page.

Anyway, big thanks to the creator of [fufufafa-memorable-quote](https://github.com/fufufufafafa/fufufafa-memorable-quotes/) for the repository

## Information about this repo
This repository currently contains **1,337** quotes, compiled from data fetched from the Kaskus website (including versions from its archive on [web.archive.org](https://web.archive.org)) and from a TXT file in the [fufufafa-memorable-quote](https://github.com/fufufufafafa/fufufafa-memorable-quotes/) repository 

You can also view the raw version of this data in a separate repository [here](https://github.com/itshaiheree/fufufafa-raw-quotes/). You can also use my own script to fetch the quote on `./tools` folder at that repo.

## How to use it?

### 1. Install dependencies
```bash
npm install
```

### 2. Using the API
If you just want to use the hosted version, you can easily access it via:
```bash
https://fufufafa-api.mhai.my.id/
```

You can also run it locally, just run this command (for npm user)
```bash
npm start
```

or this command (for bun user):
```bash
bun start
```

The server will run on:
```bash
http://localhost:3000
```

You can also override the port with:
```bash
PORT=4000 npm start
```

### 4. API endpoints
#### Get a random quote
```bash
/random
```

#### Get multiple random quotes
```bash
/random?count=5"
```

#### Get paginated quote list
```bash
/quotes?page=1&limit=10"
```

#### Search quote by keyword
```bash
/quotes?q=kerja&page=1&limit=10"
```

#### Get one quote by ID
```bash
/quotes/1
```

#### Root endpoint
```bash
/
```

### 5. Example response
```json
{
  "id": 1139,
  "quote": "TS bodoh liat aja tuh bata berjejer kita tidak butuh dubes kita tidak butuh drone kita tidak butuh tol laut apa yang kita butuhkan? pemimpin yg tegas seperti prabowo tegas tegas tegas tegas jangan tunduk pada negara lain yang kita butuhkan adalah pemimpin yg tegas kita butuh pemimpin yg menghargai pendapat orang lain menghargai bisikan setan timses dan menghargai pendapat lawan debat kita butuh pemimpin yg berwibawa bertubuh tinggi tegap dengan IQ 152 kita tidak butuh tol laut kita bisa naik kuda tabloid obor kitab suci ku fadli zon nabi ku tegas tegas tegas tegas titiek kembalilah ke pelukanku tegas tegas tegas cerai tegas tegas rujukan",
  "link": "https://m.kaskus.co.id/show_post/53a796bfd44f9fed108b46f6"
}
```

## Project notes
- The server automatically load `quotes.json` for the data.
- You can also specify another file using:
```bash
QUOTES_FILE=./quotes.json npm start
```

## Context: What is "Fufufafa"?
Fufufafa is an account at Kaskus (the most popular Indonesian forum) which is allegedly owned by Gibran Rakabuming Raka, current (2024-2029) Indonesia vice president. It stirred a lot of controversies especially since some of his comments consisting lots of funny but politically incorrect statements and completely different with his current vice president persona.
   
There is a dedicated article at [Wikipedia](https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=https://id.wikipedia.org/wiki/Fufufafa&ved=2ahUKEwiN9vDTvrGMAxX7xzgGHbcXHNsQFnoECB0QAQ&sqi=2&usg=AOvVaw09ZihAjvqCSOJt2QqUb8cO) that might give a more complete information.

## Disclaimer 
All the information on this repository is published in good faith and for general information purpose only. Any action you take upon the information you find on this repository, is strictly at your own risk. Author will not be liable for any losses and/or damages in connection with the use of information provided in here.
