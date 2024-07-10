exports.generateInvoiceID = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";

    let invoiceID = "#";

    for (let i = 0; i < 4; i++) {
      if (i % 2 === 0) {
        const randomCharIndex = Math.floor(Math.random() * characters.length);
        invoiceID += characters.charAt(randomCharIndex);
      } else {
        const randomNumIndex = Math.floor(Math.random() * numbers.length);
        invoiceID += numbers.charAt(randomNumIndex);
      }
    }

    return invoiceID;
};