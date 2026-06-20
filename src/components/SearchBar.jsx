import './SearchBar.css'
import searchIcon from '../assets/searchIcon.png'

function SearchBar() {
    function handleSubmit(event) {
        // implementation for handleSubmit will go here
        // probably phase 3/4?
    }

    return (
        <form className="searchBar" onSubmit={handleSubmit}>
            <input
                className="searchBarInput"
                type="search"
                name="search"
                placeholder="Search"
            />
            <button
                className="searchBarButton"
                type="submit"
            >
                <img
                    className="searchBarIcon"
                    src={searchIcon}
                    alt="button to send search query"
                />
            </button>
        </form>
  )
}

export default SearchBar