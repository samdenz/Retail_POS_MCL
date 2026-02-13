// scripts/seed-books.js
require('dotenv').config();
const { pool, closePool } = require('../db');

const sampleBooks = [
  {
    title: "To Kill a Mockingbird",
    isbn: "9780061120084",
    author: "Harper Lee",
    price: 14.99,
    quantity: 25
  },
  {
    title: "1984",
    isbn: "9780451524935",
    author: "George Orwell",
    price: 13.99,
    quantity: 30
  },
  {
    title: "The Great Gatsby",
    isbn: "9780743273565",
    author: "F. Scott Fitzgerald",
    price: 15.99,
    quantity: 20
  },
  {
    title: "Pride and Prejudice",
    isbn: "9780141439518",
    author: "Jane Austen",
    price: 12.99,
    quantity: 15
  },
  {
    title: "The Catcher in the Rye",
    isbn: "9780316769488",
    author: "J.D. Salinger",
    price: 13.99,
    quantity: 18
  },
  {
    title: "Harry Potter and the Sorcerer's Stone",
    isbn: "9780439708180",
    author: "J.K. Rowling",
    price: 19.99,
    quantity: 50
  },
  {
    title: "The Hobbit",
    isbn: "9780547928227",
    author: "J.R.R. Tolkien",
    price: 16.99,
    quantity: 22
  },
  {
    title: "Animal Farm",
    isbn: "9780451526342",
    author: "George Orwell",
    price: 11.99,
    quantity: 28
  },
  {
    title: "The Lord of the Rings",
    isbn: "9780544003415",
    author: "J.R.R. Tolkien",
    price: 35.99,
    quantity: 12
  },
  {
    title: "Brave New World",
    isbn: "9780060850524",
    author: "Aldous Huxley",
    price: 14.99,
    quantity: 16
  }
];

async function seedBooks() {
  console.log('Seeding database with sample books...\n');

  try {
    let addedCount = 0;
    let skippedCount = 0;

    for (const book of sampleBooks) {
      try {
        const [result] = await pool.execute(
          `INSERT INTO books (title, isbn, author, price, quantity, low_stock_threshold)
           VALUES (?, ?, ?, ?, ?, 5)`,
          [book.title, book.isbn, book.author, book.price, book.quantity]
        );

        console.log(`✓ Added: ${book.title}`);
        addedCount++;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`⊘ Skipped (already exists): ${book.title}`);
          skippedCount++;
        } else {
          throw err;
        }
      }
    }

    console.log(`\n=================================`);
    console.log(`✓ Books added: ${addedCount}`);
    console.log(`⊘ Books skipped: ${skippedCount}`);
    console.log(`=================================\n`);

  } catch (error) {
    console.error('✗ Error seeding books:', error.message);
  } finally {
    await closePool();
  }
}

seedBooks();