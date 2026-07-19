import { useEffect, useRef, useState } from 'react'
import './SearchBar.css'
import searchIcon from '../assets/searchIcon.png'

const SEARCH_TYPE_LABELS = {
    user: 'User',
    date: 'Date',
}

const SORT_OPTION_LABELS = {
    default: 'Default',
    dateNewest: 'Date newest',
    dateOldest: 'Date oldest',
    ratingHigh: 'Rating high',
    ratingLow: 'Rating low',
    commentsHigh: 'Comments high',
    commentsLow: 'Comments low',
}

function SearchBar({
    value,
    onChange,
    searchType = 'user',
    onSearchTypeChange,
    sortOption = 'default',
    onSortOptionChange,
    searchTypes = ['user', 'date'],
    showSearchTypeSelector = true,
    showFilter = true,
}) {
    const [isSearchTypeMenuOpen, setIsSearchTypeMenuOpen] = useState(false)
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false)
    const searchTypeMenuRef = useRef(null)
    const filterMenuRef = useRef(null)

    function handleSubmit(event) {
        event.preventDefault()
    }

    useEffect(() => {
        function handlePageClick(event) {
            if (
                searchTypeMenuRef.current &&
                !searchTypeMenuRef.current.contains(event.target)
            ) {
                setIsSearchTypeMenuOpen(false)
            }

            if (
                filterMenuRef.current &&
                !filterMenuRef.current.contains(event.target)
            ) {
                setIsFilterMenuOpen(false)
            }
        }

        document.addEventListener('mousedown', handlePageClick)

        return () => {
            document.removeEventListener('mousedown', handlePageClick)
        }
    }, [])

    const visibleSearchTypes = searchTypes.filter((type) => SEARCH_TYPE_LABELS[type])
    const inputType = searchType === 'date' ? 'date' : 'search'

    return (
        <form className="searchControls" onSubmit={handleSubmit}>
            {showSearchTypeSelector && visibleSearchTypes.length > 1 && (
                <div className="searchOptionRow">
                    <div className="searchOptionMenu" ref={searchTypeMenuRef}>
                        <button
                            className="searchOptionToggle"
                            type="button"
                            aria-expanded={isSearchTypeMenuOpen}
                            onClick={() => setIsSearchTypeMenuOpen((isOpen) => !isOpen)}
                        >
                            Search by: {SEARCH_TYPE_LABELS[searchType]}
                        </button>
                        {isSearchTypeMenuOpen && (
                            <div className="searchOptionPanel">
                                {visibleSearchTypes.map((type) => (
                                    <label className="searchOptionItem" key={type}>
                                        <input
                                            type="radio"
                                            name="searchType"
                                            value={type}
                                            checked={searchType === type}
                                            onChange={() => {
                                                onSearchTypeChange(type)
                                                setIsSearchTypeMenuOpen(false)
                                            }}
                                        />
                                        {SEARCH_TYPE_LABELS[type]}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="searchBar">
                <input
                    className="searchBarInput"
                    type={inputType}
                    name="search"
                    placeholder={`Search by ${SEARCH_TYPE_LABELS[searchType]}`}
                    aria-label={`Search by ${SEARCH_TYPE_LABELS[searchType]}`}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                />
                <button
                    className="searchBarButton"
                    type="submit"
                    aria-label="Search proposals"
                >
                    <img
                        className="searchBarIcon"
                        src={searchIcon}
                        alt=""
                    />
                </button>

                {showFilter && (
                    <div className="filterMenu" ref={filterMenuRef}>
                        <button
                            className="filterButton"
                            type="button"
                            aria-label="Filter proposals"
                            aria-expanded={isFilterMenuOpen}
                            onClick={() => setIsFilterMenuOpen((isOpen) => !isOpen)}
                        >
                            Filter
                        </button>
                        {isFilterMenuOpen && (
                            <div className="filterPanel">
                                {Object.entries(SORT_OPTION_LABELS).map(([option, label]) => (
                                    <label className="filterOptionItem" key={option}>
                                        <input
                                            type="radio"
                                            name="sortOption"
                                            value={option}
                                            checked={sortOption === option}
                                            onChange={() => {
                                                onSortOptionChange(option)
                                                setIsFilterMenuOpen(false)
                                            }}
                                        />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </form>
  )
}

export default SearchBar
