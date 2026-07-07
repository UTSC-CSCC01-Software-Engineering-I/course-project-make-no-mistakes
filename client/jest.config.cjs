module.exports = {
    testEnvironment: "jsdom",
    setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"],
  
    moduleNameMapper: {
      "\\.(css|less|scss|sass)$": "<rootDir>/src/test/styleMock.cjs",
      "\\.(png|jpg|jpeg|gif|svg)$": "<rootDir>/src/test/fileMock.cjs",
    },
  
    transform: {
      "^.+\\.[jt]sx?$": "babel-jest",
    },
};